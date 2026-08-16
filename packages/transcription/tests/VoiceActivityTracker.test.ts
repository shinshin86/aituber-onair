import { VoiceActivityTracker } from '../src/providers/VoiceActivityTracker';

const defaultOptions = {
  rmsThreshold: 0.015,
  minSpeechDurationMs: 150,
  silenceDurationMs: 700,
};

function createTracker(options = defaultOptions) {
  const onSpeechStart = vi.fn();
  const onSpeechEnd = vi.fn();
  const tracker = new VoiceActivityTracker(options, {
    onSpeechStart,
    onSpeechEnd,
  });

  return { tracker, onSpeechStart, onSpeechEnd };
}

describe('VoiceActivityTracker', () => {
  it('ignores short noise that does not reach the speech duration', () => {
    const { tracker, onSpeechStart, onSpeechEnd } = createTracker();

    tracker.pushFrame(0.05, 100);
    tracker.pushFrame(0, 50);

    expect(onSpeechStart).not.toHaveBeenCalled();
    expect(onSpeechEnd).not.toHaveBeenCalled();
    expect(tracker.hasPendingSpeech()).toBe(false);
  });

  it('confirms sustained speech once', () => {
    const { tracker, onSpeechStart } = createTracker();

    tracker.pushFrame(0.05, 50);
    tracker.pushFrame(0.05, 50);
    tracker.pushFrame(0.05, 50);
    tracker.pushFrame(0.05, 50);

    expect(onSpeechStart).toHaveBeenCalledOnce();
    expect(tracker.hasPendingSpeech()).toBe(true);
  });

  it('keeps confirmed speech active through a brief pause', () => {
    const { tracker, onSpeechEnd } = createTracker();
    tracker.pushFrame(0.05, 150);

    tracker.pushFrame(0, 650);
    tracker.pushFrame(0.05, 50);
    tracker.pushFrame(0, 650);

    expect(onSpeechEnd).not.toHaveBeenCalled();
    expect(tracker.hasPendingSpeech()).toBe(true);
  });

  it('ends confirmed speech after sustained silence', () => {
    const { tracker, onSpeechEnd } = createTracker();
    tracker.pushFrame(0.05, 150);

    tracker.pushFrame(0, 699);
    expect(onSpeechEnd).not.toHaveBeenCalled();

    tracker.pushFrame(0, 1);
    expect(onSpeechEnd).toHaveBeenCalledOnce();
    expect(tracker.hasPendingSpeech()).toBe(false);
  });

  it('clears pending state on reset', () => {
    const { tracker, onSpeechStart, onSpeechEnd } = createTracker();
    tracker.pushFrame(0.05, 150);

    tracker.reset();
    tracker.pushFrame(0, 700);

    expect(onSpeechStart).toHaveBeenCalledOnce();
    expect(onSpeechEnd).not.toHaveBeenCalled();
    expect(tracker.hasPendingSpeech()).toBe(false);
  });

  it('uses a custom silence duration', () => {
    const { tracker, onSpeechEnd } = createTracker({
      ...defaultOptions,
      silenceDurationMs: 300,
    });
    tracker.pushFrame(0.05, 150);

    tracker.pushFrame(0, 299);
    expect(onSpeechEnd).not.toHaveBeenCalled();

    tracker.pushFrame(0, 1);
    expect(onSpeechEnd).toHaveBeenCalledOnce();
  });
});
