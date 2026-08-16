import { normalizeLocalWhisperDownloadProgress } from '../src/providers/localWhisperProgress';

describe('normalizeLocalWhisperDownloadProgress', () => {
  it('normalizes known download totals and percentage values', () => {
    expect(
      normalizeLocalWhisperDownloadProgress({
        status: 'progress',
        file: 'model.onnx',
        loaded: 25,
        total: 100,
        progress: 25,
        rawOnly: 'not exposed',
      })
    ).toEqual({
      phase: 'download',
      file: 'model.onnx',
      loadedBytes: 25,
      totalBytes: 100,
      progress: 0.25,
    });
  });

  it('derives progress from byte totals and clamps it to the public range', () => {
    expect(
      normalizeLocalWhisperDownloadProgress({
        status: 'done',
        loaded: 120,
        total: 100,
      })
    ).toEqual({
      phase: 'download',
      loadedBytes: 120,
      totalBytes: 100,
      progress: 1,
    });
  });

  it('omits progress without a known total and ignores raw ready events', () => {
    expect(
      normalizeLocalWhisperDownloadProgress({
        status: 'download',
        file: 'model.onnx',
        loaded: 20,
        progress: 40,
      })
    ).toEqual({
      phase: 'download',
      file: 'model.onnx',
      loadedBytes: 20,
    });
    expect(
      normalizeLocalWhisperDownloadProgress({ status: 'ready' })
    ).toBeNull();
    expect(normalizeLocalWhisperDownloadProgress('progress')).toBeNull();
  });
});
