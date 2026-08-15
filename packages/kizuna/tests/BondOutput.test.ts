import { afterEach, describe, expect, it, vi } from 'vitest';
import { KizunaManager } from '../src/KizunaManager';
import { createDefaultKizunaConfig } from '../src/defaultConfig';
import type { Interaction, KizunaConfig } from '../src/types';

const createInteraction = (
  timestamp: number,
  overrides: Partial<Interaction> = {},
): Interaction => ({
  userId: 'user-1',
  kind: 'message',
  emotion: 'happy',
  isOwner: false,
  timestamp,
  metadata: { displayName: 'Aki' },
  ...overrides,
});

describe('bond output APIs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns snapshots, prompt context, and decayed relationship capital', async () => {
    let now = Date.UTC(2026, 0, 1);
    const config: KizunaConfig = {
      ...createDefaultKizunaConfig(),
      basePoints: { message: 500 },
      warmth: { halfLifeMs: 1_000, floor: 0.2 },
      now: () => now,
    };
    const manager = new KizunaManager(config, undefined, 'output-test');
    await manager.processInteraction(createInteraction(now));

    expect(manager.getBondSnapshot('user-1')).toMatchObject({
      userId: 'user-1',
      displayName: 'Aki',
      role: 'guest',
      stage: 'regular',
      level: 3,
      points: 500,
      warmth: 1,
      favoriteEmotions: [{ emotion: 'happy', count: 1 }],
    });
    expect(manager.getBondContext('user-1')).toContain(
      'Bond with Aki: regular',
    );
    expect(manager.getBondContext('user-1', { language: 'ja' })).toContain(
      'Akiとの絆: regular',
    );
    expect(manager.toRelationshipCapital('user-1')).toBe(0.5);

    now += 2_000;

    expect(manager.getBondSnapshot('user-1')?.warmth).toBe(0.4);
    expect(manager.toRelationshipCapital('user-1')).toBe(0.2);
    manager.destroy();
  });

  it('supports context template overrides and missing users', async () => {
    const config = createDefaultKizunaConfig();
    config.context = {
      templates: { en: (snapshot) => `custom:${snapshot.stage}` },
    };
    const manager = new KizunaManager(config, undefined, 'template-test');

    expect(manager.getBondSnapshot('missing')).toBeNull();
    expect(manager.getBondContext('missing')).toBe('');
    expect(manager.toRelationshipCapital('missing')).toBe(0);

    await manager.processInteraction(createInteraction(Date.now()));

    expect(manager.getBondContext('user-1')).toBe('custom:stranger');
    manager.destroy();
  });

  it('tracks continuity across explicit sessions and session gaps', async () => {
    const config = createDefaultKizunaConfig();
    config.continuity = { unit: 'session', grace: 0 };
    const manager = new KizunaManager(config, undefined, 'session-test');
    await expect(manager.beginSession('one')).resolves.toBe('one');
    await manager.processInteraction(createInteraction(Date.now()));
    manager.endSession();

    await expect(manager.beginSession('two')).resolves.toBe('two');
    await manager.processInteraction(createInteraction(Date.now()));
    expect(manager.getBondSnapshot('user-1')?.continuity.streak).toBe(2);
    manager.endSession();

    await manager.beginSession('missed');
    manager.endSession();
    await manager.beginSession('four');
    await manager.processInteraction(createInteraction(Date.now()));
    expect(manager.getBondSnapshot('user-1')?.continuity).toMatchObject({
      streak: 1,
      totalActiveBuckets: 3,
    });
    manager.destroy();
  });

  it('keeps explicit session IDs separate from the inactive bucket', async () => {
    const config = createDefaultKizunaConfig();
    config.continuity = { unit: 'session' };
    const manager = new KizunaManager(config, undefined, 'session-id-test');
    await manager.processInteraction(createInteraction(Date.now()));

    await manager.beginSession('none');
    await manager.processInteraction(createInteraction(Date.now()));

    expect(manager.getBondSnapshot('user-1')?.continuity).toMatchObject({
      streak: 2,
      totalActiveBuckets: 2,
    });
    manager.destroy();
  });

  it('makes session controls no-ops for non-session continuity', async () => {
    const manager = new KizunaManager(
      createDefaultKizunaConfig(),
      undefined,
      'non-session-test',
    );
    await expect(manager.beginSession()).resolves.toBeNull();
    manager.endSession();
    manager.destroy();
  });
});
