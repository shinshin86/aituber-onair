interface FrameInput {
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

/** Settle pose fades and physics without consuming captured video frames. */
export function warmUpLive2d(
  advance: (input: FrameInput) => void,
  seconds: number,
  fps: number,
) {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 30)
    throw new Error('Live2D warm-up seconds must be between 0 and 30.');
  if (!Number.isFinite(fps) || fps <= 0)
    throw new Error('Live2D warm-up fps must be positive.');
  const frames = Math.ceil(seconds * fps);
  for (let frame = 0; frame < frames; frame++)
    advance({
      time: (frame + 1) / fps,
      deltaSeconds: 1 / fps,
      mouth: 0,
      eyesClosed: false,
    });
  return {
    configuredSeconds: seconds,
    settledSeconds: frames / fps,
    frames,
    fixedDeltaSeconds: 1 / fps,
    capturedFrames: 0,
  };
}
