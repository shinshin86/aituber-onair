import { describe, expect, it } from 'vitest';
import {
  assessPsdMotionProfileCompatibility,
  createDefaultPsdMotionProfile,
  createPsdLayerSignature,
  createPsdMotionProfileFile,
  createPsdMotionProfileRuntime,
  deleteStoredPsdMotionProfile,
  getPsdMotionProfileExportFileName,
  normalizePsdMotionProfile,
  parsePsdMotionProfileJson,
  PSD_MOTION_PROFILE_FORMAT,
  PSD_MOTION_PROFILE_MAX_JSON_BYTES,
  PSD_MOTION_PROFILE_STORAGE_KEY,
  PSD_MOTION_PROFILE_VERSION,
  readStoredPsdMotionProfile,
  saveStoredPsdMotionProfile,
  serializePsdMotionProfileFile,
  sha256Hex,
  type PsdMotionModelIdentity,
  type PsdMotionProfileFile,
  type StorageLike,
} from '../src/lib/psdMotionProfile';
import {
  composePsdMotionMouthOpen,
  resolveBasePsdMotionParameters,
} from '../src/lib/rig/anime25Renderer';
import type { Anime25RigResult } from '../src/lib/rig/anime25Rig';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const identity: PsdMotionModelIdentity = {
  sha256: 'a'.repeat(64),
  width: 1024,
  height: 2048,
  layerSignature: 'b'.repeat(64),
  fileNameHint: 'avatar.psd',
};

function createRig(
  overrides: Partial<Anime25RigResult> = {},
): Anime25RigResult {
  return {
    canvas: { w: 1024, h: 2048 },
    layers: [
      { name: 'Front_Hair', x: 10.1, y: 20.1, w: 100.1, h: 200.1 },
      { name: 'Face', x: 30, y: 40, w: 300, h: 400 },
    ],
    anchors: {},
    warnings: [],
    ...overrides,
  };
}

function exportedFile(
  overrides: Partial<PsdMotionProfileFile> = {},
): PsdMotionProfileFile {
  return {
    ...createPsdMotionProfileFile(
      identity,
      createDefaultPsdMotionProfile(),
      new Date('2026-07-17T00:00:00.000Z'),
    ),
    ...overrides,
  };
}

describe('PSD motion profile defaults and normalization', () => {
  it('keeps the renderer-compatible default values', () => {
    const profile = createDefaultPsdMotionProfile();

    expect(profile.parameters).toMatchObject({
      angleX: 0,
      eyeOpenL: 1,
      eyeOpenR: 1,
      mouthOpen: 0,
      physAmp: 2,
      soft: 2,
      fhAmp: 2,
      fhSoft: 0.4,
      bust: 2.5,
      bustY: 1,
    });
    expect(profile.automation).toEqual({
      idle: true,
      randomMotion: true,
      blink: true,
      physics: true,
    });
  });

  it('clamps finite numbers and rejects strings, NaN, and Infinity', () => {
    const profile = normalizePsdMotionProfile({
      parameters: {
        angleX: 4,
        angleY: -3,
        angleZ: '0.5',
        eyeOpenL: -1,
        irisScale: 9,
        mouthOpen: Number.NaN,
        physAmp: Number.POSITIVE_INFINITY,
        bustY: -9,
        unknown: 42,
      },
      automation: {
        idle: false,
        randomMotion: 'false',
        blink: true,
        physics: 0,
      },
    });

    expect(profile.parameters.angleX).toBe(1);
    expect(profile.parameters.angleY).toBe(-1);
    expect(profile.parameters.angleZ).toBe(0);
    expect(profile.parameters.eyeOpenL).toBe(0);
    expect(profile.parameters.irisScale).toBe(1.3);
    expect(profile.parameters.mouthOpen).toBe(0);
    expect(profile.parameters.physAmp).toBe(2);
    expect(profile.parameters.bustY).toBe(-3);
    expect(profile.automation).toEqual({
      idle: false,
      randomMotion: true,
      blink: true,
      physics: true,
    });
    expect(profile.parameters).not.toHaveProperty('unknown');
  });

  it('falls back safely for arrays and invalid objects', () => {
    expect(normalizePsdMotionProfile(null)).toEqual(
      createDefaultPsdMotionProfile(),
    );
    expect(normalizePsdMotionProfile([])).toEqual(
      createDefaultPsdMotionProfile(),
    );
    expect(
      normalizePsdMotionProfile({ parameters: [], automation: 'invalid' }),
    ).toEqual(createDefaultPsdMotionProfile());
  });

  it('updates a runtime profile without rebuilding renderer resources', () => {
    const runtime = createPsdMotionProfileRuntime();
    const next = createDefaultPsdMotionProfile();
    next.parameters.angleX = 0.75;

    runtime.setMotionProfile(next);

    expect(runtime.getProfile().parameters.angleX).toBe(0.75);
    expect(runtime.getProfile().parameters.eyeOpenL).toBe(1);
  });
});

describe('PSD motion profile JSON', () => {
  it('round-trips only the versioned profile fields', () => {
    const profile = createDefaultPsdMotionProfile();
    profile.parameters.angleX = 0.4;
    profile.automation.blink = false;
    const json = serializePsdMotionProfileFile(
      createPsdMotionProfileFile(
        identity,
        profile,
        new Date('2026-07-17T00:00:00.000Z'),
      ),
    );
    const parsed = parsePsdMotionProfileJson(json);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.format).toBe(PSD_MOTION_PROFILE_FORMAT);
    expect(parsed.file.version).toBe(PSD_MOTION_PROFILE_VERSION);
    expect(parsed.file.model).toEqual(identity);
    expect(parsed.file.parameters.angleX).toBe(0.4);
    expect(parsed.file.automation.blink).toBe(false);
    expect(parsed.file).not.toHaveProperty('apiKey');
    expect(parsed.file).not.toHaveProperty('pixelData');
  });

  it('rejects parse errors, invalid formats, and unknown versions', () => {
    expect(parsePsdMotionProfileJson('{').ok).toBe(false);
    expect(
      parsePsdMotionProfileJson(
        JSON.stringify({ ...exportedFile(), format: 'other-format' }),
      ),
    ).toEqual({ ok: false, error: 'Invalid motion profile format.' });
    expect(
      parsePsdMotionProfileJson(
        JSON.stringify({ ...exportedFile(), version: 2 }),
      ),
    ).toEqual({ ok: false, error: 'Unsupported motion profile version.' });
  });

  it('rejects JSON over the size limit', () => {
    const result = parsePsdMotionProfileJson(
      ' '.repeat(PSD_MOTION_PROFILE_MAX_JSON_BYTES + 1),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('64 KB');
  });

  it('ignores unknown properties and clamps imported values', () => {
    const value = exportedFile();
    const json = JSON.stringify({
      ...value,
      __proto__: { polluted: true },
      parameters: {
        ...value.parameters,
        angleX: 100,
        mouthOpen: '1',
        __proto__: { polluted: true },
      },
      automation: { ...value.automation, unknown: false },
      unknown: 'ignored',
    });
    const parsed = parsePsdMotionProfileJson(json);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.parameters.angleX).toBe(1);
    expect(parsed.file.parameters.mouthOpen).toBe(0);
    expect(parsed.file.parameters).not.toHaveProperty('polluted');
    expect(parsed.file).not.toHaveProperty('unknown');
  });

  it('uses a safe sidecar file name', () => {
    expect(getPsdMotionProfileExportFileName('/tmp/avatar.PSD')).toBe(
      'avatar.motion.json',
    );
  });
});

describe('PSD motion profile identity and compatibility', () => {
  it('hashes PSD content independently of the file name', async () => {
    const sameContentA = await sha256Hex(new TextEncoder().encode('same PSD'));
    const sameContentB = await sha256Hex(new TextEncoder().encode('same PSD'));
    const otherContent = await sha256Hex(new TextEncoder().encode('other PSD'));

    expect(sameContentA).toBe(sameContentB);
    expect(sameContentA).not.toBe(otherContent);
    expect(sameContentA).toMatch(/^[a-f\d]{64}$/);
  });

  it('includes canvas, normalized layer order, and approximate bounds', async () => {
    const base = await createPsdLayerSignature(createRig());
    const normalizedName = await createPsdLayerSignature(
      createRig({
        layers: [
          { name: ' front hair ', x: 10.4, y: 20.4, w: 100.4, h: 200.4 },
          { name: 'FACE', x: 30, y: 40, w: 300, h: 400 },
        ],
      }),
    );
    const reordered = await createPsdLayerSignature(
      createRig({ layers: [...createRig().layers].reverse() }),
    );
    const changedBounds = await createPsdLayerSignature(
      createRig({
        layers: [
          { name: 'Front_Hair', x: 12, y: 20, w: 100, h: 200 },
          createRig().layers[1],
        ],
      }),
    );
    const changedCanvas = await createPsdLayerSignature(
      createRig({ canvas: { w: 1000, h: 2048 } }),
    );

    expect(normalizedName).toBe(base);
    expect(reordered).not.toBe(base);
    expect(changedBounds).not.toBe(base);
    expect(changedCanvas).not.toBe(base);
  });

  it('applies exact hashes, warns for matching layouts, and rejects mismatches', () => {
    expect(
      assessPsdMotionProfileCompatibility(exportedFile(), identity).status,
    ).toBe('exact');
    expect(
      assessPsdMotionProfileCompatibility(exportedFile(), {
        ...identity,
        sha256: 'c'.repeat(64),
      }).status,
    ).toBe('matching-layout');
    expect(
      assessPsdMotionProfileCompatibility(exportedFile(), {
        ...identity,
        sha256: 'c'.repeat(64),
        layerSignature: 'd'.repeat(64),
      }).status,
    ).toBe('incompatible');
  });
});

describe('PSD motion profile localStorage', () => {
  it('restores a SHA-keyed profile without changing the static PSD store', () => {
    const storage = new MemoryStorage();
    const staticKey = 'react-psd-app-psd-avatar-settings';
    storage.setItem(staticKey, '{"legacy":true}');
    const profile = createDefaultPsdMotionProfile();
    profile.parameters.body = 0.6;

    expect(
      saveStoredPsdMotionProfile(storage, identity.sha256, profile).ok,
    ).toBe(true);
    const restored = readStoredPsdMotionProfile(storage, identity.sha256);

    expect(restored.ok).toBe(true);
    expect(restored.found).toBe(true);
    expect(restored.profile.parameters.body).toBe(0.6);
    expect(storage.getItem(staticKey)).toBe('{"legacy":true}');
    expect(storage.getItem(PSD_MOTION_PROFILE_STORAGE_KEY)).toContain(
      identity.sha256,
    );
  });

  it('falls back when saved data is corrupt or storage throws', () => {
    const storage = new MemoryStorage();
    storage.setItem(PSD_MOTION_PROFILE_STORAGE_KEY, '{');

    const corrupt = readStoredPsdMotionProfile(storage, identity.sha256);
    expect(corrupt.ok).toBe(false);
    expect(corrupt.profile).toEqual(createDefaultPsdMotionProfile());

    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(
      readStoredPsdMotionProfile(throwingStorage, identity.sha256).ok,
    ).toBe(false);
    expect(
      saveStoredPsdMotionProfile(
        throwingStorage,
        identity.sha256,
        createDefaultPsdMotionProfile(),
      ).ok,
    ).toBe(false);
  });

  it('deletes the saved entry when reset to defaults', () => {
    const storage = new MemoryStorage();
    saveStoredPsdMotionProfile(
      storage,
      identity.sha256,
      createDefaultPsdMotionProfile(),
    );

    expect(deleteStoredPsdMotionProfile(storage, identity.sha256).ok).toBe(
      true,
    );
    expect(readStoredPsdMotionProfile(storage, identity.sha256).found).toBe(
      false,
    );
  });
});

describe('PSD motion renderer composition', () => {
  it('keeps the existing frame defaults when no profile is saved', () => {
    const profile = createDefaultPsdMotionProfile();

    expect(resolveBasePsdMotionParameters(profile, 0, true)).toEqual(
      profile.parameters,
    );
  });

  it('uses the larger of the mouth baseline and TTS input', () => {
    expect(composePsdMotionMouthOpen(0.7, 0.25)).toBe(0.7);
    expect(composePsdMotionMouthOpen(0.2, 0.85)).toBe(0.85);
    expect(composePsdMotionMouthOpen(-1, 3)).toBe(1);
  });

  it('keeps the master switch as the motion profile boundary', () => {
    const profile = createDefaultPsdMotionProfile();
    profile.parameters.angleX = 0.8;
    profile.parameters.mouthOpen = 0.6;

    const disabled = resolveBasePsdMotionParameters(profile, 1, false);

    expect(disabled.angleX).toBe(0);
    expect(disabled.mouthOpen).toBe(0);
  });
});
