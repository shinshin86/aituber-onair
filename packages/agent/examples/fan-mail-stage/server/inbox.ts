import { constants, watch, type FSWatcher } from 'node:fs';
import { lstat, mkdir, open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { MailController } from './controller.js';
import { MAX_FILE_BYTES } from './validation.js';

interface Observation {
  signature: string;
  since: number;
  processed: boolean;
}

export class InboxWatcher {
  private seen = new Map<string, Observation>();
  private watcher?: FSWatcher;
  private timer?: ReturnType<typeof setInterval>;
  private pending = Promise.resolve();
  private stopped = false;
  constructor(
    private directory: string,
    private controller: MailController,
    private stableMs = 350,
    private rescanMs = 500
  ) {}

  async start() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.directory);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error('Inbox must be a real directory.');
    this.watcher = watch(this.directory, () => {
      void this.scan().catch(() => {});
    });
    // Periodic scans remain active if the platform watcher fails.
    this.watcher.on('error', () => this.watcher?.close());
    this.timer = setInterval(() => {
      void this.scan().catch(() => {});
    }, this.rescanMs);
    await this.scan();
  }

  scan() {
    const run = this.pending.catch(() => {}).then(() => this.scanFiles());
    this.pending = run;
    return run;
  }

  private async scanFiles() {
    if (this.stopped) return;
    const names = (await readdir(this.directory)).filter(
      (name) =>
        /^[^.~][^/\\]*\.json$/.test(name) &&
        !/\.(tmp|part|partial)\.json$/i.test(name)
    );
    const entries = await Promise.all(
      names.map(async (name) => {
        try {
          return { name, stat: await lstat(join(this.directory, name)) };
        } catch {
          return null;
        }
      })
    );
    entries.sort(
      (a, b) =>
        (a?.stat.mtimeMs ?? 0) - (b?.stat.mtimeMs ?? 0) ||
        (a?.name ?? '').localeCompare(b?.name ?? '')
    );
    for (const entry of entries) {
      if (!entry) continue;
      const { name, stat } = entry;
      const signature = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
      const prior = this.seen.get(name);
      if (!prior || prior.signature !== signature) {
        this.seen.set(name, { signature, since: Date.now(), processed: false });
        continue;
      }
      if (prior.processed || Date.now() - prior.since < this.stableMs) continue;
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size > MAX_FILE_BYTES
      ) {
        await this.controller.invalid(`${name}:${signature}`);
        prior.processed = true;
        continue;
      }
      let handle: Awaited<ReturnType<typeof open>> | undefined;
      try {
        handle = await open(
          join(this.directory, name),
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
        );
        const before = await handle.stat();
        if (
          !before.isFile() ||
          before.ino !== stat.ino ||
          before.dev !== stat.dev ||
          before.size !== stat.size ||
          before.mtimeMs !== stat.mtimeMs ||
          before.ctimeMs !== stat.ctimeMs
        )
          continue;
        const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const after = await handle.stat();
        if (
          before.size !== after.size ||
          before.mtimeMs !== after.mtimeMs ||
          before.ctimeMs !== after.ctimeMs ||
          bytesRead !== before.size
        )
          continue;
        if (bytesRead > MAX_FILE_BYTES) throw new Error('Too large.');
        await this.controller.ingest(
          JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'))
        );
        prior.processed = true;
      } catch {
        await this.controller.invalid(`${name}:${signature}`);
        prior.processed = true;
      } finally {
        await handle?.close();
      }
    }
    for (const name of this.seen.keys())
      if (!names.includes(name)) this.seen.delete(name);
  }

  async close() {
    this.stopped = true;
    this.watcher?.close();
    clearInterval(this.timer);
    await this.pending.catch(() => {});
  }
}
