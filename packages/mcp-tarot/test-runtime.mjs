import { CardDeck } from './dist/services/CardDeck.js';
import { SpreadEngine, SPREADS } from './dist/services/SpreadEngine.js';

console.log('Testing CardDeck (real metadata)...');
const deck = CardDeck.load();
console.log('Loaded cards:', deck.size());
if (deck.size() !== 78) throw new Error('Expected 78 cards, got ' + deck.size());

deck.shuffle(12345);
const drawn = deck.draw(3, 12345, true);
console.log('Drawn cards:', drawn.length);
console.log('Remaining:', deck.size());
console.log('First card:', drawn[0].card.name, drawn[0].reversed ? '(inverted)' : '');

const layout = new SpreadEngine().calculateLayout('cruz_celta');
console.log('Spread positions:', layout.positions.length, '/ cards_count', layout.cards_count);

const ids = new Set(Object.keys(SPREADS));
console.log('Total spreads:', ids.size);
for (const [k, v] of Object.entries(SPREADS)) {
  const l = new SpreadEngine().calculateLayout(k);
  if (l.positions.length !== v.cards_count) throw new Error(`Spread ${k} inconsistent`);
}
console.log('✓ All 12 spreads have consistent layouts');
console.log('✓ CardDeck + SpreadEngine work');
