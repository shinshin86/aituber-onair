export interface SynthesisResult {
  wavPath: string;
  durationSec: number;
}

export interface VoiceEngine {
  synthesize(
    text: string,
    options: Record<string, unknown>,
    workDir: string,
  ): Promise<SynthesisResult>;
}
