import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ChildProcess, spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

interface ProcessResult {
  output: string;
  exitCode: number;
}

interface MockServer {
  endpoint: string;
  requestCount: () => number;
  requestPaths: () => string[];
  close: () => Promise<void>;
}

type MockAction =
  | { kind: "tool"; id: string; name: string; input: unknown }
  | { kind: "text"; content: string };

async function waitUntil(
  condition: () => boolean,
  timeoutMs: number,
  errorMessage: string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolveSleep) => {
      setTimeout(resolveSleep, 50);
    });
  }
  throw new Error(errorMessage);
}

async function waitForExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<number> {
  if (child.exitCode !== null) {
    return child.exitCode;
  }

  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Agent process did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });
}

function toChatCompletionResponse(action: MockAction): Record<string, unknown> {
  if (action.kind === "tool") {
    return {
      id: "chatcmpl-mock",
      object: "chat.completion",
      created: 1,
      model: "mock-model",
      choices: [
        {
          index: 0,
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: action.id,
                type: "function",
                function: {
                  name: action.name,
                  arguments: JSON.stringify(action.input),
                },
              },
            ],
          },
        },
      ],
    };
  }

  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: 1,
    model: "mock-model",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: action.content,
        },
      },
    ],
  };
}

function toResponsesOneShotResponse(
  action: MockAction,
): Record<string, unknown> {
  if (action.kind === "tool") {
    return {
      id: "resp-mock",
      object: "response",
      output: [
        {
          type: "function_call",
          id: action.id,
          name: action.name,
          arguments: JSON.stringify(action.input),
        },
      ],
    };
  }

  return {
    id: "resp-mock",
    object: "response",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: action.content }],
      },
    ],
  };
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(data));
}

function writeChatSse(res: ServerResponse, action: MockAction): void {
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache");
  res.setHeader("connection", "keep-alive");

  if (action.kind === "tool") {
    const payload = {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: action.id,
                type: "function",
                function: {
                  name: action.name,
                  arguments: JSON.stringify(action.input),
                },
              },
            ],
          },
        },
      ],
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } else {
    const payload = {
      choices: [{ delta: { content: action.content } }],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

function writeResponsesSse(res: ServerResponse, action: MockAction): void {
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache");
  res.setHeader("connection", "keep-alive");

  if (action.kind === "tool") {
    const payload = {
      item: {
        type: "function_call",
        id: action.id,
        name: action.name,
        arguments: JSON.stringify(action.input),
      },
    };
    res.write("event: response.output_item.added\n");
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } else {
    const payload = { delta: action.content };
    res.write("event: response.output_text.delta\n");
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  res.write("event: response.completed\n");
  res.write("data: {}\n\n");
  res.end();
}

function getActionForStep(step: number): MockAction {
  if (step === 1) {
    return {
      kind: "tool",
      id: "call_list_files",
      name: "list_files",
      input: { glob: "**/*", maxItems: 20 },
    };
  }

  if (step === 2) {
    return {
      kind: "tool",
      id: "call_write_file",
      name: "write_file",
      input: {
        path: "hello.js",
        content: 'console.log("hello");\n',
        mode: "create",
      },
    };
  }

  if (step === 3) {
    return {
      kind: "tool",
      id: "call_exec_command",
      name: "exec_command",
      input: {
        command: "node",
        args: ["hello.js"],
        timeoutMs: 5000,
      },
    };
  }

  return { kind: "text", content: "Completed." };
}

async function startMockOpenAIServer(): Promise<MockServer> {
  let step = 0;
  let requestCount = 0;
  const requestPaths: string[] = [];

  const server = createServer(async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 404, { error: "not found" });
      return;
    }

    requestCount += 1;
    const path = req.url || "/";
    requestPaths.push(path);

    let stream = false;
    try {
      const body = await readJsonBody(req);
      if (typeof body === "object" && body && "stream" in body) {
        stream = Boolean((body as { stream?: unknown }).stream);
      }
    } catch {
      writeJson(res, 400, { error: "invalid json" });
      return;
    }

    step += 1;
    const action = getActionForStep(step);
    const isResponsesPath = path.includes("/responses");

    if (isResponsesPath) {
      if (stream) {
        writeResponsesSse(res, action);
      } else {
        writeJson(res, 200, toResponsesOneShotResponse(action));
      }
      return;
    }

    if (stream) {
      writeChatSse(res, action);
      return;
    }

    writeJson(res, 200, toChatCompletionResponse(action));
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      resolveListen();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start mock server");
  }

  return {
    endpoint: `http://127.0.0.1:${address.port}/v1/chat/completions`,
    requestCount: () => requestCount,
    requestPaths: () => requestPaths.slice(),
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      }),
  };
}

async function runAgentScenario(
  workspace: string,
  prompt: string,
  endpoint: string,
): Promise<ProcessResult> {
  const child = spawn(process.execPath, ["dist/index.js", workspace], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AGENT_PROVIDER: "openai",
      AGENT_MODEL: "mock-model",
      AGENT_API_KEY: "dummy",
      AGENT_OPENAI_ENDPOINT: endpoint,
      AGENT_MAX_HOPS: "6",
      AGENT_RESPONSE_LENGTH: "veryShort",
      AGENT_RECOVERABLE_RETRIES: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk: Buffer | Uint8Array) => {
    output += Buffer.from(chunk).toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer | Uint8Array) => {
    output += Buffer.from(chunk).toString("utf8");
  });

  await waitUntil(
    () => output.includes("agent>"),
    20_000,
    "REPL prompt missing",
  );

  const promptCountBefore = output.split("agent>").length - 1;
  child.stdin.write(`${prompt}\n`);

  await waitUntil(
    () => output.split("agent>").length - 1 > promptCountBefore,
    40_000,
    "Agent did not return to prompt",
  );

  child.stdin.end("exit\n");
  const exitCode = await waitForExit(child, 10_000);
  return { output, exitCode };
}

async function assertFileExists(path: string, output: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(
      `Expected generated file was not found: ${path}\n\n${output}`,
    );
  }
}

describe("coding-agent e2e smoke", () => {
  it("runs deterministic tool loop with local mock provider", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "coding-agent-e2e-"));
    const mock = await startMockOpenAIServer();

    try {
      const generatedPath = join(workspace, "hello.js");
      const result = await runAgentScenario(
        workspace,
        "Create hello.js and run it.",
        mock.endpoint,
      );

      await assertFileExists(generatedPath, result.output);
      const generated = await readFile(generatedPath, "utf8");

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("[TOOL_USE] list_files");
      expect(result.output).toContain("[TOOL_USE] write_file");
      expect(result.output).toContain("[TOOL_USE] exec_command");
      expect(result.output).toContain("assistant> Completed.");
      expect(generated).toBe('console.log("hello");\n');
      expect(mock.requestCount()).toBeGreaterThanOrEqual(4);
      expect(mock.requestPaths().length).toBeGreaterThanOrEqual(4);
    } finally {
      await mock.close();
      await rm(workspace, { recursive: true, force: true });
    }
  }, 60_000);
});
