import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Card } from '../types.js';

// Allow overriding for tests / non-standard layouts
const META_PATH =
  process.env.TAROT_ASSETS_DIR
    ? path.join(process.env.TAROT_ASSETS_DIR, 'cards', 'metadata.json')
    : path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        // src/services/CardDeck.ts or dist/services/CardDeck.js → package root → sibling assets package
        '../../../tarot-assets/cards/metadata.json',
      );

export interface DrawnCard {
  card: Card;
  reversed: boolean;
  position_id: number;
  position_name: string;
}

/**
 * Deck of 78 Rider-Waite-Smith cards with Fisher-Yates shuffle.
 * Reversals are deterministic per draw (seeded PRNG) so tests can assert.
 */
export class CardDeck {
  private deck: Card[] = [];
  /** Copia inmutable de los 78 originales: shuffle() siempre repone el mazo completo. */
  private all: Card[];

  static load(): CardDeck {
    const raw = readFileSync(META_PATH, 'utf-8');
    const cards = JSON.parse(raw) as Card[];
    if (cards.length !== 78) throw new Error(`Deck must have 78 cards, got ${cards.length}`);
    return new CardDeck(cards);
  }

  constructor(cards: Card[]) {
    this.all = [...cards];
    this.deck = [...cards];
  }

  size(): number {
    return this.deck.length;
  }

  getByName(id: string): Card | undefined {
    return this.deck.find((c) => c.id === id);
  }

  /** Fisher-Yates. Optional seed for deterministic tests (mulberry32). Repone el mazo completo antes de barajar. */
  shuffle(seed?: number): void {
    this.deck = [...this.all];
    const rand = seed === undefined ? Math.random : mulberry32(seed);
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  /**
   * Draw n cards (without replacement within one shuffle cycle).
   * Reversed by default when reversed allowed, ~30% probability.
   */
  draw(n: number, seed?: number, allowReversed = true): DrawnCard[] {
    const rand = mulberry32(seed ?? Date.now());
    const out: DrawnCard[] = [];
    for (let i = 0; i < n && this.deck.length > 0; i++) {
      const card = this.deck.pop()!;
      out.push({
        card,
        reversed: allowReversed && rand() < 0.3,
        position_id: i + 1,
        position_name: ''
      });
    }
    if (out.length !== n) {
      throw new Error(`Asked ${n} cards but only ${out.length} were available. Call shuffle() first.`);
    }
    return out;
  }
}

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
