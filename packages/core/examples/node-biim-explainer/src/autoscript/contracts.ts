import { readFile } from 'node:fs/promises';

export interface SceneState {
  sceneChanged: boolean;
  context: { phase: string; location: string; goal: string };
  facts: {
    text: string;
    source: 'screen' | 'memo';
    confidence: number;
    evidence?: string;
  }[];
  events: { kind: string; text: string; importance: number }[];
  metrics: Record<string, number>;
}
export interface Profile {
  name: string;
  map: { description: string; maxChars: number };
  textbook: { description: string; maxChars: number; maxItems: number };
  scoreboard: { label: string; metric: string };
  friend: { instruction: string; maxChars: number };
}
export interface PanelCandidate {
  top?: string;
  main?: { text: string; fact: number }[];
}
export interface CommentaryCandidate {
  text: string | null;
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a JSON object');
  return value as Record<string, unknown>;
}
export function parseJson(text: string): unknown {
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```$/, ''),
  );
}
export const chars = (text: string) => Array.from(text).length;
export function shortText(value: unknown, max: number): string {
  if (
    typeof value !== 'string' ||
    chars(value) > max ||
    Array.from(value).some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error(`Expected a single line of at most ${max} characters`);
  return value.trim();
}

/** Reject malformed structure; omit uncertain facts instead of inventing data. */
export function parseScene(value: unknown, memo: string): SceneState {
  const v = object(value);
  const context = object(v.context);
  if (
    typeof v.sceneChanged !== 'boolean' ||
    !Array.isArray(v.facts) ||
    !Array.isArray(v.events)
  )
    throw new Error(
      'SceneState requires sceneChanged, context, facts and events',
    );
  const facts: SceneState['facts'] = [];
  for (const raw of v.facts) {
    const f = object(raw);
    if (
      (f.source !== 'screen' && f.source !== 'memo') ||
      typeof f.confidence !== 'number' ||
      !Number.isFinite(f.confidence) ||
      f.confidence < 0.6 ||
      f.confidence > 1
    )
      continue;
    const text = shortText(f.text, 200);
    if (!text) continue;
    // Memo facts must cite a literal excerpt. Screen evidence is still an LLM
    // observation, not proof; the debug file retains it for human review.
    if (
      f.source === 'memo' &&
      (typeof f.evidence !== 'string' ||
        !f.evidence.trim() ||
        !memo.includes(f.evidence))
    )
      continue;
    facts.push({
      text,
      source: f.source,
      confidence: f.confidence,
      ...(typeof f.evidence === 'string'
        ? { evidence: shortText(f.evidence, 300) }
        : {}),
    });
  }
  const metrics: Record<string, number> = Object.create(null);
  for (const [key, number] of Object.entries(object(v.metrics)))
    if (
      /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) &&
      typeof number === 'number' &&
      Number.isFinite(number)
    )
      metrics[key] = number;
  return {
    sceneChanged: v.sceneChanged,
    context: {
      phase: shortText(context.phase, 80),
      location: shortText(context.location, 80),
      goal: shortText(context.goal, 80),
    },
    facts,
    events: v.events.map((raw) => {
      const e = object(raw);
      if (![1, 2, 3].includes(e.importance as number))
        throw new Error('Event importance must be 1, 2 or 3');
      return {
        kind: shortText(e.kind, 40),
        text: shortText(e.text, 200),
        importance: e.importance as number,
      };
    }),
    metrics,
  };
}

export function parsePanels(
  value: unknown,
  profile: Profile,
  scene: SceneState,
): PanelCandidate {
  const v = object(value);
  const result: PanelCandidate = {};
  if (v.top !== undefined && v.top !== null)
    result.top = shortText(v.top, profile.map.maxChars);
  if (v.main !== undefined && v.main !== null) {
    if (!Array.isArray(v.main) || v.main.length > profile.textbook.maxItems)
      throw new Error('Too many textbook items');
    result.main = v.main.map((raw) => {
      const item = object(raw);
      if (!Number.isInteger(item.fact) || !scene.facts[item.fact as number])
        throw new Error('Panel item must cite a current fact index');
      const text = shortText(item.text, profile.textbook.maxChars);
      if (!text)
        throw new Error('Textbook items cannot be empty; use [] to clear');
      return {
        text,
        fact: item.fact as number,
      };
    });
  }
  return result;
}
export function parseCommentary(
  value: unknown,
  profile: Profile,
): CommentaryCandidate {
  const v = object(value);
  return {
    text:
      v.text === null
        ? null
        : shortText(v.text, profile.friend.maxChars) || null,
  };
}

export function parseProfile(value: unknown): Profile {
  const v = object(value);
  const map = object(v.map);
  const textbook = object(v.textbook);
  const scoreboard = object(v.scoreboard);
  const friend = object(v.friend);
  function limit(raw: unknown, max: number): number {
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > max)
      throw new Error(`Profile limit must be 1..${max}`);
    return raw as number;
  }
  const metric = shortText(scoreboard.metric, 40);
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(metric))
    throw new Error('Invalid metric key');
  return {
    name: shortText(v.name, 80),
    map: {
      description: shortText(map.description, 500),
      maxChars: limit(map.maxChars, 16),
    },
    textbook: {
      description: shortText(textbook.description, 500),
      maxChars: limit(textbook.maxChars, 20),
      maxItems: limit(textbook.maxItems, 2),
    },
    scoreboard: { label: shortText(scoreboard.label, 16), metric },
    friend: {
      instruction: shortText(friend.instruction, 1000),
      maxChars: limit(friend.maxChars, 50),
    },
  };
}
export async function loadProfile(filename: string): Promise<Profile> {
  return parseProfile(JSON.parse(await readFile(filename, 'utf8')));
}
