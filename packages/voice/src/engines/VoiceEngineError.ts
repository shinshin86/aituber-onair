export type VoiceEngineErrorKind = 'configuration' | 'network' | 'api';

export class VoiceEngineError extends Error {
  readonly kind: VoiceEngineErrorKind;
  readonly statusCode?: number;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      kind: VoiceEngineErrorKind;
      statusCode?: number;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'VoiceEngineError';
    this.kind = options.kind;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
  }
}
