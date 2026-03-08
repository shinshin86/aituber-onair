export class ToolLoopGuard {
  private lastSignature = "";
  private identicalCallCount = 0;
  private consecutiveFailures = 0;
  private consecutiveEmptyListResults = 0;
  private halted = false;
  private haltReason = "";

  constructor(
    private readonly maxIdenticalCalls: number,
    private readonly maxConsecutiveFailures: number,
    private readonly maxConsecutiveEmptyListResults: number = 2,
  ) {}

  resetForNextTurn(): void {
    this.lastSignature = "";
    this.identicalCallCount = 0;
    this.consecutiveFailures = 0;
    this.consecutiveEmptyListResults = 0;
    this.halted = false;
    this.haltReason = "";
  }

  beforeCall(toolName: string, input: unknown): void {
    if (this.halted) {
      throw new Error(this.haltReason || "Loop halted");
    }

    const signature = `${toolName}:${stableStringify(input)}`;
    if (signature === this.lastSignature) {
      this.identicalCallCount += 1;
    } else {
      this.lastSignature = signature;
      this.identicalCallCount = 1;
    }

    if (this.identicalCallCount > this.maxIdenticalCalls) {
      this.stop("Repeated identical tool call detected");
    }

    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.stop("Too many consecutive tool failures detected");
    }
  }

  afterCall(toolName: string, output: unknown, isError: boolean): void {
    if (!isError) {
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures += 1;
    }

    if (
      toolName === "list_files" &&
      !isError &&
      isEmptyListFilesOutput(output)
    ) {
      this.consecutiveEmptyListResults += 1;
      if (
        this.consecutiveEmptyListResults > this.maxConsecutiveEmptyListResults
      ) {
        throw new Error(
          "Stalled on empty list_files results. If the user asked to create code, use write_file directly.",
        );
      }
      return;
    }

    this.consecutiveEmptyListResults = 0;
  }

  private stop(reason: string): never {
    this.halted = true;
    this.haltReason = reason;
    throw new Error(reason);
  }
}

function isEmptyListFilesOutput(output: unknown): boolean {
  if (!output || typeof output !== "object") {
    return false;
  }

  if (!("files" in output)) {
    return false;
  }

  const files = (output as { files?: unknown }).files;
  return Array.isArray(files) && files.length === 0;
}

function stableStringify(input: unknown): string {
  return JSON.stringify(sortKeys(input));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, sortKeys(nested)]),
  );
}
