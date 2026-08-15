import type { MetricKey, StreamingPlatform } from './data/types.js';
import {
  evidenceKey,
  type EvidenceLedgerSnapshot,
  type EvidenceSourceType,
} from './evidence.js';

export interface ProposalEvidence {
  readonly platform: StreamingPlatform;
  readonly sourceType: EvidenceSourceType;
  readonly sourceId: string;
}

export interface ChannelStrategyProposal {
  readonly schemaVersion: 1;
  readonly summary: string;
  readonly recommendation: {
    readonly platform: StreamingPlatform;
    readonly gameId: string;
    readonly format: string;
    readonly contentTags: readonly string[];
  };
  readonly observedFacts: readonly {
    readonly statement: string;
    readonly evidence: readonly ProposalEvidence[];
  }[];
  readonly inferences: readonly {
    readonly statement: string;
    readonly basedOn: readonly number[];
  }[];
  readonly risks: readonly string[];
  readonly limitations: readonly string[];
  readonly experiment: {
    readonly hypothesis: string;
    readonly successMetrics: readonly {
      readonly metric: MetricKey;
      readonly direction: 'increase' | 'decrease' | 'maintain';
      readonly targetPercent: number;
    }[];
  };
}

const METRIC_KEYS = new Set<MetricKey>([
  'views',
  'averageViewDurationSeconds',
  'averageViewPercentage',
  'subscribersGained',
  'followersGained',
  'averageConcurrentViewers',
  'peakConcurrentViewers',
  'chatMessages',
  'likes',
  'comments',
]);

export function parseAndValidateProposal(
  text: string,
  ledger: EvidenceLedgerSnapshot
): ChannelStrategyProposal {
  let value: unknown;
  try {
    value = JSON.parse(stripCodeFence(text));
  } catch {
    throw new Error('Agent output must be one valid JSON object.');
  }
  const root = asRecord(value, 'proposal');
  if (root.schemaVersion !== 1) {
    throw new Error('proposal.schemaVersion must be 1.');
  }
  const summary = readText(root.summary, 'proposal.summary');
  const recommendation = asRecord(
    root.recommendation,
    'proposal.recommendation'
  );
  const platform = readPlatform(
    recommendation.platform,
    'proposal.recommendation.platform'
  );
  const gameId = readText(
    recommendation.gameId,
    'proposal.recommendation.gameId'
  );
  if (!ledger.gameIds.has(gameId)) {
    throw new Error(`Recommendation cites an unobserved gameId: ${gameId}`);
  }
  const format = readText(
    recommendation.format,
    'proposal.recommendation.format'
  );
  const contentTags = readTextArray(
    recommendation.contentTags,
    'proposal.recommendation.contentTags'
  );
  for (const tag of contentTags) {
    if (!ledger.contentTags.has(tag)) {
      throw new Error(`Recommendation cites an unobserved content tag: ${tag}`);
    }
  }

  const observedFacts = readArray(root.observedFacts, 'proposal.observedFacts');
  if (observedFacts.length === 0) {
    throw new Error('proposal.observedFacts must not be empty.');
  }
  const facts = observedFacts.map((item, factIndex) => {
    const fact = asRecord(item, `proposal.observedFacts[${factIndex}]`);
    const evidenceValues = readArray(
      fact.evidence,
      `proposal.observedFacts[${factIndex}].evidence`
    );
    if (evidenceValues.length === 0) {
      throw new Error(`Observed fact ${factIndex} must cite evidence.`);
    }
    const evidence = evidenceValues.map((entry, evidenceIndex) => {
      const path = `proposal.observedFacts[${factIndex}].evidence[${evidenceIndex}]`;
      const record = asRecord(entry, path);
      const evidencePlatform = readPlatform(
        record.platform,
        `${path}.platform`
      );
      const sourceType = readSourceType(
        record.sourceType,
        `${path}.sourceType`
      );
      const sourceId = readText(record.sourceId, `${path}.sourceId`);
      const key = evidenceKey(evidencePlatform, sourceType, sourceId);
      if (!ledger.evidence.has(key)) {
        throw new Error(
          `Proposal cites evidence not present in the dataset: ${key}`
        );
      }
      return { platform: evidencePlatform, sourceType, sourceId };
    });
    return {
      statement: readText(
        fact.statement,
        `proposal.observedFacts[${factIndex}].statement`
      ),
      evidence,
    };
  });

  const inferences = readArray(root.inferences, 'proposal.inferences').map(
    (item, index) => {
      const path = `proposal.inferences[${index}]`;
      const inference = asRecord(item, path);
      const basedOn = readArray(inference.basedOn, `${path}.basedOn`).map(
        (value, referenceIndex) => {
          if (
            !Number.isInteger(value) ||
            Number(value) < 0 ||
            Number(value) >= facts.length
          ) {
            throw new Error(`${path}.basedOn[${referenceIndex}] is invalid.`);
          }
          return Number(value);
        }
      );
      if (basedOn.length === 0) {
        throw new Error(`${path}.basedOn must not be empty.`);
      }
      return {
        statement: readText(inference.statement, `${path}.statement`),
        basedOn,
      };
    }
  );

  const experiment = asRecord(root.experiment, 'proposal.experiment');
  const successMetrics = readArray(
    experiment.successMetrics,
    'proposal.experiment.successMetrics'
  ).map((item, index) => {
    const path = `proposal.experiment.successMetrics[${index}]`;
    const metric = asRecord(item, path);
    const metricKey = readText(metric.metric, `${path}.metric`) as MetricKey;
    if (!METRIC_KEYS.has(metricKey)) {
      throw new Error(`${path}.metric is unsupported.`);
    }
    const direction = metric.direction;
    if (
      direction !== 'increase' &&
      direction !== 'decrease' &&
      direction !== 'maintain'
    ) {
      throw new Error(`${path}.direction is unsupported.`);
    }
    if (
      typeof metric.targetPercent !== 'number' ||
      !Number.isFinite(metric.targetPercent) ||
      metric.targetPercent < 0
    ) {
      throw new Error(`${path}.targetPercent must be a non-negative number.`);
    }
    return {
      metric: metricKey,
      direction: direction as 'increase' | 'decrease' | 'maintain',
      targetPercent: metric.targetPercent,
    };
  });
  if (successMetrics.length === 0) {
    throw new Error('proposal.experiment.successMetrics must not be empty.');
  }

  return {
    schemaVersion: 1,
    summary,
    recommendation: { platform, gameId, format, contentTags },
    observedFacts: facts,
    inferences,
    risks: readTextArray(root.risks, 'proposal.risks'),
    limitations: readTextArray(root.limitations, 'proposal.limitations'),
    experiment: {
      hypothesis: readText(
        experiment.hypothesis,
        'proposal.experiment.hypothesis'
      ),
      successMetrics,
    },
  };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function readArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  return value;
}

function readText(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return value.trim();
}

function readTextArray(value: unknown, path: string): readonly string[] {
  return readArray(value, path).map((entry, index) =>
    readText(entry, `${path}[${index}]`)
  );
}

function readPlatform(value: unknown, path: string): StreamingPlatform {
  if (value !== 'youtube' && value !== 'twitch') {
    throw new Error(`${path} must be youtube or twitch.`);
  }
  return value;
}

function readSourceType(value: unknown, path: string): EvidenceSourceType {
  if (value !== 'stream' && value !== 'strategy') {
    throw new Error(`${path} must be stream or strategy.`);
  }
  return value;
}
