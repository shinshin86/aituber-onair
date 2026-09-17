import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createNeuralWorkingMemory } from '@aituber-onair/noise';
import { withCodexService, reply } from './codex.mjs';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean' },
    offline: { type: 'boolean' },
    input: { type: 'string' },
    model: { type: 'string' },
    'sdk-path': { type: 'string' },
  },
});
if (values.help) {
  console.log(
    'node run.mjs [--offline] [--input session.json] [--sdk-path /path/to/sdk/dist/index.js] [--model MODEL]\nOffline prints selected memory only. Live uses Chat codex-sdk and existing file-backed login. Outputs JSONL.'
  );
  process.exit(0);
}
const input = JSON.parse(
  await readFile(
    values.input ?? new URL('./session.json', import.meta.url),
    'utf8'
  )
);
if (
  typeof input.system !== 'string' ||
  input.system.length > 16000 ||
  !Array.isArray(input.episodes) ||
  input.episodes.length > 256 ||
  !Array.isArray(input.turns) ||
  !input.turns.length ||
  input.turns.length > 100
)
  throw new Error('Invalid session');

// Validate and prepare the whole session before authenticating or making calls.
const memory = createNeuralWorkingMemory({
  dimensions: input.dimensions,
  capacity: Math.max(1, input.episodes.length),
});
for (const episode of input.episodes) memory.remember(episode);
const turns = input.turns.map((turn) => {
  if (
    !Array.isArray(turn.messages) ||
    !turn.messages.length ||
    turn.messages.length > 32 ||
    !turn.messages.every(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() &&
        m.content.length <= 16000
    ) ||
    turn.messages.at(-1).role !== 'user' ||
    (turn.observations !== undefined &&
      (!Array.isArray(turn.observations) || turn.observations.length > 100))
  )
    throw new Error('Invalid turn');
  for (const vector of turn.observations ?? []) memory.observe(vector);
  const recall = memory.recall(turn.vector, input.budget);
  return {
    recall,
    messages: [
      { role: 'system', content: input.system },
      ...recall.episodes.flatMap((episode) => episode.messages),
      ...turn.messages,
    ],
  };
});
async function run(service) {
  for (const [index, turn] of turns.entries()) {
    const output = service ? await reply(service, turn.messages) : undefined;
    console.log(
      JSON.stringify({ turn: index, ...turn, ...(output ? { output } : {}) })
    );
  }
}
if (values.offline) await run();
else
  await withCodexService(
    { sdkPath: values['sdk-path'], model: values.model },
    run
  );
