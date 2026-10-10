export type MeshAvatarEmotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'relaxed'
  | 'neutral';

export interface MeshAvatarMotionInfo {
  id: string;
  label: string;
  /** true for the small idle motions played at random while waiting */
  idle: boolean;
}

export interface MeshAvatarOptions {
  /** Folder with layers.json and the layer PNGs. Default: `/avatar/qipao/` */
  assetsBase?: string;
  /** Run no animation loop; advance time yourself with `advance()` (video rendering). */
  manual?: boolean;
  /** Margin above the image, as a share of its height; negative hides the image's top
   * (its flat cut edge). Default: -0.07 */
  padTop?: number;
  /** Empty margin left and right, as a share of its width. Default: 0 */
  padSide?: number;
}

export interface MeshAvatar {
  readonly motions: MeshAvatarMotionInfo[];
  /** 0..1 loudness of the voice being played (e.g. normalised RMS) */
  setVoiceLevel(level: number): void;
  /** true while TTS audio is playing: idle motions pause and the head nods along */
  setSpeaking(speaking: boolean): void;
  /** AITuber OnAir emotion tag; unknown tags fall back to neutral */
  setEmotion(
    emotion: MeshAvatarEmotion | string | null | undefined,
    options?: { playMotion?: boolean }
  ): void;
  /** How much the head moves with the voice while speaking (1 = default) */
  setTalkGain(gain: number): void;
  /** Play a motion or idle motion by id (see `motions`) */
  play(id: string): void;
  /** Move the mouth through the vowels of kana text, without audio (previews / tuning) */
  speakKana(text: string): void;
  setAutoIdle(enabled: boolean): void;
  setAutoMotion(enabled: boolean): void;
  /** Hair / tassel sway multiplier (1 = default) */
  setSwayGain(gain: number): void;
  /** Called with the motion id when a motion starts and with null when it ends */
  onMotion(listener: (id: string | null) => void): () => void;
  /** Advance the simulation by `seconds` and draw (tests / hidden tabs) */
  advance(seconds: number, fps?: number): void;
  destroy(): void;
}

export function createMeshAvatar(
  canvas: HTMLCanvasElement,
  options?: MeshAvatarOptions
): Promise<MeshAvatar>;
