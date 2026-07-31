import type { AgentBackend, AgentBackendCapabilities } from './types.js';

export interface CodexAppServerBackendCapabilities
  extends AgentBackendCapabilities {
  readonly text: true;
  readonly streaming: true;
  readonly interruption: true;
  readonly sessionResume: true;
  readonly detailedEvents: true;
}

export interface CodexAppServerCompatibility {
  readonly expectedVersion: string;
  readonly schemaVersion: string;
}

export interface CodexAppServerCommonOptions {
  readonly workingDirectory: string;
  readonly compatibility: CodexAppServerCompatibility;
  readonly environment?: Readonly<Record<string, string>>;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly enableExperimentalApi?: boolean;
}

export type CodexAppServerExecutableOptions =
  | {
      readonly codexPath: string;
      readonly allowPathLookup?: false;
    }
  | {
      readonly codexPath?: never;
      readonly allowPathLookup: true;
    };

export type CodexAppServerBackendOptions = CodexAppServerCommonOptions &
  CodexAppServerExecutableOptions;

/**
 * Node.js runtime implementation is introduced in the app-server phase and
 * remains isolated behind this subpath.
 */
export interface CodexAppServerBackend extends AgentBackend {
  readonly kind: 'codex-app-server';
  readonly capabilities: Readonly<CodexAppServerBackendCapabilities>;
}
