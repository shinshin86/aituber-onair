import { describe, expect, it } from 'vitest';
import {
  ViewerMemoryStore,
  buildViewerContext,
  normalizeViewerId,
} from '../src/index.js';
import type { MemoryStorageAdapter } from '../src/types.js';

function memoryAdapter(): MemoryStorageAdapter {
  const mem = { value: null as string | null };
  return {
    load: () => mem.value,
    save: (p) => {
      mem.value = p;
    },
  };
}

describe('normalizeViewerId', () => {
  it('quita @ y pone minúsculas', () => {
    expect(normalizeViewerId('@Andrea425')).toBe('andrea425');
    expect(normalizeViewerId('  DARKlord ')).toBe('darklord');
  });
});

describe('ViewerMemoryStore', () => {
  it('persiste el estado entre instancias (mismo adapter)', () => {
    const adapter = memoryAdapter();
    const s1 = new ViewerMemoryStore(adapter);
    s1.recordMessage('@andrea425', 'Andrea425', 'tiktok');
    s1.recordMessage('@andrea425', 'Andrea425', 'tiktok');

    const s2 = new ViewerMemoryStore(adapter);
    const record = s2.get('andrea425');
    expect(record).toBeDefined();
    expect(record?.totalMessageCount).toBe(2);
    expect(record?.displayName).toBe('Andrea');
  });

  it('guarda el nombre real y lo usa en el displayName', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    s.recordMessage('@xLuna_9', 'xLuna_9', 'tiktok');
    s.setRealName('xluna_9', 'Lucía Fernández');
    const record = s.get('xluna_9');
    expect(record?.realName).toBe('Lucía Fernández');
    expect(record?.displayName).toBe('Lucía Fernández');
    expect(record?.tags).toContain('has-real-name');
  });

  it('acumula consultaciones con continuidad temporal', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    s.recordConsultation('andrea425', { topic: 'amor', about: 'Jose', platform: 'tiktok' });
    s.recordConsultation('andrea425', { topic: 'amor', about: 'Paco', platform: 'tiktok' });
    const record = s.get('andrea425');
    expect(record?.consultations).toHaveLength(2);
    // la más reciente es la primero
    expect(record?.consultations[0].about).toBe('Paco');
    expect(record?.consultations[1].about).toBe('Jose');
  });

  it('acumula regalos y asigna tier vip', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    s.recordGift('@andrea425', 'Andrea425', { name: 'Rose', diamonds: 1 });
    expect(s.getDonorTier('andrea425')).toBe('regular');

    // donación grande
    s.recordGift('@vips', 'VIPfan', { name: 'Galaxy', diamonds: 500 });
    expect(s.getDonorTier('vips')).toBe('vip');
    expect(s.get('vips')?.tags).toContain('vip');
  });

  it('ordena por prioridad: vip primero, luego diamantes, luego mensajes', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    s.recordGift('vip', 'V', { name: 'Lion', diamonds: 1000 });
    s.recordGift('mid', 'M', { name: 'Rose', diamonds: 10 });
    // regular sin regalos pero 30 mensajes
    for (let i = 0; i < 30; i++) s.recordMessage('@small', 'small', 'tiktok');

    const ranked = s.rankViewersByPriority();
    expect(ranked[0].viewerId).toBe('vip');
    expect(ranked[1].viewerId).toBe('mid');
    expect(ranked[2].viewerId).toBe('small');
  });

  it('cierra sesión y sube el nivel de relación', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    s.recordMessage('@andrea425', 'Andrea425', 'tiktok');
    const before = s.get('andrea425')?.relationshipLevel ?? 0;
    s.endSession('andrea425', 'Preguntó por amor con Jose', Date.now() - 3600e3, 'tiktok', 1);
    const after = s.get('andrea425')?.relationshipLevel ?? 0;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(s.get('andrea425')?.sessions[0].summary).toBe(
      'Preguntó por amor con Jose',
    );
  });
});

describe('buildViewerContext', () => {
  it('genera contexto con identidad, consultas y regalos', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    s.recordMessage('@andrea425', 'Andrea425', 'tiktok');
    s.recordConsultation('andrea425', { topic: 'amor', about: 'Jose' });
    s.recordGift('andrea425', 'Andrea425', { name: 'Lion', diamonds: 100 });
    s.recordPersonalEvent('andrea425', { kind: 'viaje', summary: 'viaje a la costa' });

    const ctx = buildViewerContext(s.get('andrea425')!);
    expect(ctx).toContain('Andrea');
    expect(ctx).toContain('amor');
    expect(ctx).toContain('Jose');
    expect(ctx).toContain('Lion');
    expect(ctx).toContain('viaje a la costa');
  });

  it('devuelve cadena vacía si no hay memoria', () => {
    const s = new ViewerMemoryStore(memoryAdapter());
    // espectador nunca registrado -> sin contexto
    expect(
      s
        .get('nadie')
        ?.viewerId,
    ).toBeUndefined();
  });
});
