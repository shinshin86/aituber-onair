import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import type {
  ResolvedStrategyOutcome,
  StrategyOutcome,
  StrategyRecord,
  StreamingPlatform,
} from '../src/data/types.js';

export type NewAgentProposal = Omit<StrategyRecord, 'id'> & {
  readonly source: 'agent';
  readonly result: 'pending';
  readonly proposedAt: string;
};

export class StrategyStoreError extends Error {
  constructor(
    readonly code: 'not-found' | 'immutable',
    message: string
  ) {
    super(message);
  }
}

let temporaryFileSequence = 0;
const mutationQueues = new Map<string, Promise<void>>();

export async function readProposalHistory(
  filePath: string
): Promise<readonly StrategyRecord[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (!Array.isArray(parsed) || !parsed.every(isAgentProposal)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function appendProposal(
  filePath: string,
  record: NewAgentProposal
): Promise<StrategyRecord> {
  return mutateHistory(filePath, async (history) => {
    const nextSequence =
      history.reduce((maximum, candidate) => {
        const match = /^agent-(\d+)$/.exec(candidate.id);
        return match ? Math.max(maximum, Number(match[1])) : maximum;
      }, 0) + 1;
    const appended: StrategyRecord = {
      ...record,
      id: `agent-${String(nextSequence).padStart(3, '0')}`,
    };
    return { history: [...history, appended], result: appended };
  });
}

export function recordOutcome(
  filePath: string,
  id: string,
  outcome: ResolvedStrategyOutcome,
  finding: string
): Promise<StrategyRecord> {
  return mutateHistory(filePath, async (history) => {
    const index = history.findIndex((candidate) => candidate.id === id);
    if (index < 0) {
      throw new StrategyStoreError(
        'not-found',
        `Proposal ${id} was not found.`
      );
    }
    const current = history[index];
    if (current.source !== 'agent') {
      throw new StrategyStoreError(
        'immutable',
        'Fixture strategies cannot be updated.'
      );
    }
    if (current.result !== 'pending') {
      throw new StrategyStoreError(
        'immutable',
        'Only pending Agent proposals can receive an outcome.'
      );
    }
    const updated: StrategyRecord = {
      ...current,
      result: outcome,
      finding,
    };
    const next = [...history];
    next[index] = updated;
    return { history: next, result: updated };
  });
}

function mutateHistory<T>(
  filePath: string,
  mutation: (history: readonly StrategyRecord[]) => Promise<{
    readonly history: readonly StrategyRecord[];
    readonly result: T;
  }>
): Promise<T> {
  const previous = mutationQueues.get(filePath) ?? Promise.resolve();
  const operation = previous.then(async () => {
    const { history, result } = await mutation(
      await readProposalHistory(filePath)
    );
    await writeProposalHistory(filePath, history);
    return result;
  });
  const settled = operation.then(
    () => undefined,
    () => undefined
  );
  mutationQueues.set(filePath, settled);
  void settled.then(() => {
    if (mutationQueues.get(filePath) === settled) {
      mutationQueues.delete(filePath);
    }
  });
  return operation;
}

async function writeProposalHistory(
  filePath: string,
  history: readonly StrategyRecord[]
): Promise<void> {
  temporaryFileSequence += 1;
  const temporaryPath = `${filePath}.${process.pid}.${temporaryFileSequence}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(history, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function isAgentProposal(value: unknown): value is StrategyRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    /^agent-\d+$/.test(record.id) &&
    isPlatform(record.platform) &&
    typeof record.hypothesis === 'string' &&
    record.hypothesis.length > 0 &&
    Array.isArray(record.targetStreamIds) &&
    record.targetStreamIds.every((id) => typeof id === 'string') &&
    isStrategyOutcome(record.result) &&
    typeof record.finding === 'string' &&
    record.finding.length > 0 &&
    record.source === 'agent' &&
    typeof record.proposedAt === 'string' &&
    !Number.isNaN(Date.parse(record.proposedAt))
  );
}

function isPlatform(value: unknown): value is StreamingPlatform {
  return value === 'youtube' || value === 'twitch';
}

function isStrategyOutcome(value: unknown): value is StrategyOutcome {
  return (
    value === 'supported' ||
    value === 'refuted' ||
    value === 'mixed' ||
    value === 'pending'
  );
}
