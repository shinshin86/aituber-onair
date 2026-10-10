import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentBackend } from '@aituber-onair/agent';
import type {
  BackendKind,
  MailRecord,
  OperatorState,
  Reaction,
  StageState,
} from '../src/protocol.js';
import { generateReaction } from './agent.js';
import { isSensitive, parseDraft, parseMail } from './validation.js';

export class MailController {
  private records: MailRecord[] = [];
  private worker: Promise<void> = Promise.resolve();
  private persistence: Promise<void> = Promise.resolve();
  private closed = false;
  private approvals = new Set<string>();

  constructor(
    readonly backendKind: BackendKind,
    private backend: AgentBackend,
    private dataDir: string
  ) {}

  async start() {
    await mkdir(join(this.dataDir, 'outbox'), { recursive: true, mode: 0o700 });
    try {
      const stored: unknown = JSON.parse(
        await readFile(join(this.dataDir, 'state.json'), 'utf8')
      );
      if (!Array.isArray(stored)) throw new Error('Invalid state.');
      for (const entry of stored as MailRecord[]) {
        if (
          !entry ||
          typeof entry.id !== 'string' ||
          !Number.isInteger(entry.sequence) ||
          !Number.isInteger(entry.revision) ||
          ![
            'received',
            'generating',
            'ready_for_review',
            'approved',
            'rejected',
            'invalid',
            'quarantined',
            'generation_failed',
          ].includes(entry.status)
        )
          throw new Error('Invalid state.');
        if (entry.mail) entry.mail = parseMail(entry.mail);
        if (entry.draft) entry.draft = parseDraft(entry.draft);
        if (entry.reaction) {
          const value = entry.reaction;
          if (
            !entry.mail ||
            value.eventId !== entry.mail.eventId ||
            !['mock', 'cursor-acp'].includes(value.backend) ||
            !Number.isFinite(Date.parse(value.approvedAt))
          )
            throw new Error('Invalid state.');
          entry.reaction = {
            ...parseDraft({
              publicSubject: value.publicSubject,
              publicExcerpt: value.publicExcerpt,
              speechText: value.speechText,
            }),
            eventId: value.eventId,
            backend: value.backend,
            approvedAt: value.approvedAt,
          };
        }
        if (entry.status === 'approved' && !entry.reaction)
          throw new Error('Invalid state.');
        if (entry.status === 'generating' || entry.status === 'received') {
          entry.status = 'generation_failed';
          entry.notice = 'Generation was interrupted. Regenerate to retry.';
        }
      }
      this.records = stored;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error(
          'Cannot load local state. Restore or move data/state.json before restarting.'
        );
    }
  }

  operatorState(): OperatorState {
    return structuredClone({
      backend: this.backendKind,
      records: this.records,
    });
  }

  stageState(): StageState {
    return {
      backend: this.backendKind,
      reactions: this.records
        .flatMap((record) =>
          record.status === 'approved' && record.reaction
            ? [{ ...record.reaction }]
            : []
        )
        .sort((a, b) => a.approvedAt.localeCompare(b.approvedAt)),
    };
  }

  async ingest(value: unknown) {
    const mail = parseMail(value);
    if (this.records.some((record) => record.mail?.eventId === mail.eventId))
      return;
    const record: MailRecord = {
      id: randomUUID(),
      sequence: this.records.length + 1,
      revision: 0,
      status: isSensitive(mail) ? 'quarantined' : 'received',
      mail,
      agentEvents: [],
    };
    this.records.push(record);
    await this.persist();
    if (record.status === 'received') this.enqueue(record);
  }

  async invalid(fingerprint: string) {
    const id = `invalid-${createHash('sha256').update(fingerprint).digest('hex')}`;
    if (this.records.some((record) => record.id === id)) return;
    this.records.push({
      id,
      sequence: this.records.length + 1,
      revision: 0,
      status: 'invalid',
      notice: 'Rejected file: invalid JSON, schema, size, or file type.',
      agentEvents: [],
    });
    await this.persist();
  }

  private enqueue(record: MailRecord) {
    this.worker = this.worker
      .then(async () => {
        if (this.closed || record.status !== 'received' || !record.mail) return;
        record.status = 'generating';
        record.backend = this.backendKind;
        record.revision += 1;
        record.agentEvents = [];
        record.notice = undefined;
        try {
          await this.persist();
          const draft = await generateReaction(
            this.backend,
            record.mail,
            (type) => {
              if (record.agentEvents.length < 40) record.agentEvents.push(type);
            }
          );
          record.draft = draft;
          record.status = 'ready_for_review';
        } catch {
          record.status = 'generation_failed';
          record.notice =
            'Generation failed. Check backend configuration and regenerate.';
        }
        await this.persist();
      })
      .catch(() => {
        record.status = 'generation_failed';
        record.notice =
          'Cannot save local state. Check data directory permissions.';
      });
  }

  async action(id: string, action: string, draft?: unknown) {
    const record = this.records.find((item) => item.id === id);
    if (!record || !record.mail) throw new Error('Mail not found.');
    if (this.approvals.has(id))
      throw new Error('Approval is already being saved.');
    if (action === 'release' && record.status === 'quarantined') {
      record.status = 'received';
      await this.persist();
      this.enqueue(record);
      return;
    }
    if (
      action === 'regenerate' &&
      ['ready_for_review', 'generation_failed'].includes(record.status)
    ) {
      record.status = 'received';
      record.draft = undefined;
      await this.persist();
      this.enqueue(record);
      return;
    }
    if (
      action === 'reject' &&
      ['ready_for_review', 'generation_failed', 'quarantined'].includes(
        record.status
      )
    ) {
      record.status = 'rejected';
      await this.persist();
      return;
    }
    if (action === 'approve' && record.status === 'ready_for_review') {
      const validated = parseDraft(draft);
      const reaction: Reaction = {
        ...validated,
        eventId: record.mail.eventId,
        backend: record.backend ?? this.backendKind,
        approvedAt: new Date().toISOString(),
      };
      // Reserve the record before I/O so simultaneous approvals cannot publish twice.
      this.approvals.add(id);
      try {
        const filename = createHash('sha256')
          .update(record.mail.eventId)
          .digest('hex');
        await atomicJson(
          join(this.dataDir, 'outbox', `${filename}.json`),
          reaction
        );
        record.status = 'approved';
        record.reaction = reaction;
        record.draft = validated;
        await this.persist();
      } catch {
        record.status = 'ready_for_review';
        record.reaction = undefined;
        throw new Error(
          'Could not save approval. Check local storage and retry.'
        );
      } finally {
        this.approvals.delete(id);
      }
      return;
    }
    throw new Error('This action is not available in the current state.');
  }

  private persist() {
    const snapshot = structuredClone(this.records);
    const write = this.persistence
      .catch(() => {})
      .then(() => atomicJson(join(this.dataDir, 'state.json'), snapshot));
    this.persistence = write;
    return write;
  }

  async idle() {
    await this.worker;
    await this.persistence;
  }
  async close() {
    this.closed = true;
    await this.idle();
  }
}

export async function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  await rename(temporary, path);
}
