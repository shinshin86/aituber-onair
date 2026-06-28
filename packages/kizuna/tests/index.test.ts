import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { version } from '../src/index';

describe('@aituber-onair/kizuna index exports', () => {
  it('exports the package version', () => {
    expect(version).toBe(packageJson.version);
  });
});
