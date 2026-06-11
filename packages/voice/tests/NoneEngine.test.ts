import { describe, expect, it } from 'vitest';
import { NoneEngine } from '../src/engines/NoneEngine';

describe('NoneEngine', () => {
  it('should return an empty audio buffer', async () => {
    const engine = new NoneEngine();

    await expect(
      engine.fetchAudio({ style: 'talk', message: 'Hello' }, 'speaker'),
    ).resolves.toHaveProperty('byteLength', 0);
  });

  it('should return the default or custom test message', () => {
    const engine = new NoneEngine();

    expect(engine.getTestMessage()).toBe('No voice mode is active');
    expect(engine.getTestMessage('custom')).toBe('custom');
  });

  it('should ignore custom API endpoint updates', () => {
    const engine = new NoneEngine();

    expect(() => engine.setApiEndpoint?.('http://localhost')).not.toThrow();
  });
});
