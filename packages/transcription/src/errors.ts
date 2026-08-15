import type {
  TranscriptionError,
  TranscriptionErrorCode,
  TranscriptionProviderName,
} from './types';

export class TranscriptionSessionError
  extends Error
  implements TranscriptionError
{
  readonly code: TranscriptionErrorCode;
  readonly provider: TranscriptionProviderName;

  constructor(
    code: TranscriptionErrorCode,
    provider: TranscriptionProviderName,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = 'TranscriptionSessionError';
    this.code = code;
    this.provider = provider;
    if (options && 'cause' in options) {
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        configurable: true,
      });
    }
  }
}
