import {
  createContaminator,
  createContextFingerprint,
  createVirtualNoiseBrain,
  buildInterventionPlan,
  buildFrictionParameters,
} from '../src';
import { createGraphNoiseBrain } from '../src/brain/createNoiseBrain';
import {
  decodeBrainGraph,
  encodeBrainGraph,
  validateMaleCnsManifest,
  type BrainGraph,
} from '../src/brain/graph';
import {
  normalizeModulation,
  type NoiseModulatorInput,
} from '../src/brain/modulation';
import { createBrainSimulator } from '../src/brain/simulator';
import { getAllowedInterventions } from '../src/core/relationshipGate';
import { loadMaleCnsNoiseBrain } from '../src/node/loadMaleCnsNoiseBrain';

const context = createContextFingerprint({
  systemPrompt: 'A playful streamer',
  messages: [{ role: 'user', content: 'Wow! Again!?' }],
});
const input: NoiseModulatorInput = {
  context,
  diagnosis: { score: 0.8, issues: [] },
  intensity: 0.5,
  mode: 'performer',
};
function fixture(): BrainGraph {
  const n = 32;
  return {
    offsets: Uint32Array.from({ length: n + 1 }, (_, i) => i),
    targets: Uint32Array.from({ length: n }, (_, i) => (i + 1) % n),
    weights: new Float32Array(n).fill(1),
    bodyIds: Uint32Array.from({ length: n }, (_, i) => 1000 + i),
    flags: Uint32Array.from(
      { length: n },
      (_, i) => (i === 0 ? 0 : 255 << 8) | (i > 16 ? 1 : 0) | (i % 2 ? 2 : 4)
    ),
  };
}

describe('experimental brain', () => {
  it('round trips the portable layout and rejects malformed graphs', () => {
    const graph = fixture();
    const buffer = encodeBrainGraph(graph);
    expect(decodeBrainGraph(buffer)).toEqual(graph);
    expect(() => decodeBrainGraph(buffer.slice(0, -4))).toThrow();
    new DataView(buffer).setUint32(0, 0, true);
    expect(() => decodeBrainGraph(buffer)).toThrow();
    graph.targets[0] = 999;
    expect(() => encodeBrainGraph(graph)).toThrow();
  });
  it('propagates with one-step delay, retains self edges and resets', () => {
    const graph = fixture();
    const sim = createBrainSimulator(graph);
    sim.stimulate(Uint32Array.of(0), 2);
    sim.run({ steps: 1, dtMs: 1 });
    expect(sim.spikeCounts[0]).toBe(1);
    expect(sim.spikeCounts[1]).toBe(0);
    sim.run({ steps: 1, dtMs: 1 });
    expect(sim.spikeCounts[1]).toBe(1);
    sim.reset();
    expect(sim.snapshot().every((v) => v === 0)).toBe(true);
    sim.run({ steps: 5, dtMs: 1 });
    expect(sim.spikeCounts.every((v) => v === 0)).toBe(true);
    graph.targets[0] = 0;
    expect(decodeBrainGraph(encodeBrainGraph(graph)).targets[0]).toBe(0);
  });
  it('is reproducible after every turn and isolates activity snapshots', async () => {
    const brain = createVirtualNoiseBrain();
    const a = await brain.modulate(input);
    const spikes = brain.getActivitySnapshot();
    const b = await brain.modulate(input);
    expect(b).toEqual(a);
    expect(brain.getActivitySnapshot()).toEqual(spikes);
    expect(a.brainState?.descendingActivity).toBeGreaterThan(0);
    expect(a.brainState?.globalActivity).toBeGreaterThan(0);
    spikes.fill(999);
    expect(brain.getActivitySnapshot()[0]).not.toBe(999);
    expect(
      await createVirtualNoiseBrain({ seed: 43 }).modulate(input)
    ).not.toEqual(a);
    expect(
      await brain.modulate({
        ...input,
        context: { ...context, userEnergy: 0, streamTension: 1 },
        diagnosis: { score: 0, issues: [] },
      })
    ).not.toEqual(a);
  });
  it('reads activity that reached actual fixture readout neurons', async () => {
    const brain = createGraphNoiseBrain(
      decodeBrainGraph(encodeBrainGraph(fixture())),
      { provider: 'virtual', steps: 32 }
    );
    const result = await brain.modulate({
      ...input,
      context: { ...context, userEnergy: 1 },
    });
    expect(result.brainState?.descendingActivity).toBeGreaterThan(0);
    expect(brain.getBodyIds()[31]).toBe(1031);
  });
  it('rejects invalid options, missing datasets and unexpected manifests', async () => {
    expect(() =>
      createVirtualNoiseBrain({ neurons: Number.POSITIVE_INFINITY })
    ).toThrow();
    expect(() => createVirtualNoiseBrain({ steps: Number.NaN })).toThrow();
    expect(() => validateMaleCnsManifest({ neuronCount: 1 })).toThrow();
    await expect(
      loadMaleCnsNoiseBrain({ dataDir: 'data/does-not-exist' })
    ).rejects.toThrow();
  });
  it('bounds finite and malformed values and drops unknown controls', () => {
    const result = normalizeModulation({
      intensityScale: Number.POSITIVE_INFINITY,
      personaDelta: { warmth: 99, humor: Number.NaN },
      interventionBias: { tsukkomi: -99 },
    });
    expect(result.intensityScale).toBe(1);
    expect(result.personaDelta).toEqual({ warmth: 0.2, humor: 0 });
    expect(result.interventionBias?.tsukkomi).toBe(-0.25);
    expect(normalizeModulation({ intensityScale: -10 }).intensityScale).toBe(
      0.75
    );
    expect(normalizeModulation({ intensityScale: 10 }).intensityScale).toBe(
      1.25
    );
  });
  it('biases ranking only among licensed interventions and bounds persona', () => {
    const args = {
      diagnosis: {
        score: 0.8,
        issues: [{ kind: 'over_agreement' as const, severity: 0.8 }],
      },
      context,
      intensity: 0.5,
      mode: 'subtle' as const,
    };
    const diagnosis = {
      ...args.diagnosis,
      issues: args.diagnosis.issues.map((i) => ({ ...i, evidence: 'test' })),
    };
    const normal = buildInterventionPlan({ ...args, diagnosis });
    const biased = buildInterventionPlan({
      ...args,
      diagnosis,
      interventionBias: {
        contrarian_reframe: 0.25,
        reduce_over_agreement: -0.25,
      },
    });
    expect(biased.interventions[0].kind).toBe('contrarian_reframe');
    expect(biased).not.toEqual(normal);
    const allowed = getAllowedInterventions('stranger');
    const restricted = buildInterventionPlan({
      ...args,
      diagnosis,
      allowedInterventions: allowed,
      interventionBias: { contrarian_reframe: 0.25, tsukkomi: 0.25 },
    });
    expect(restricted.interventions.every((i) => allowed.has(i.kind))).toBe(
      true
    );
    const base = buildFrictionParameters({ diagnosis, context, plan: normal });
    const changed = buildFrictionParameters({
      diagnosis,
      context,
      plan: normal,
      personaDelta: { warmth: 100, humor: -100 },
    });
    expect(changed.persona.warmth).toBeCloseTo(
      Math.min(1, base.persona.warmth + 0.2)
    );
    expect(changed.persona.humor).toBeCloseTo(
      Math.max(0, base.persona.humor - 0.2)
    );
    expect(changed.constraints).toEqual(base.constraints);
  });
});

const turn = {
  systemPrompt: 'AITuberです。',
  messages: [],
  draft: '今日は来てくれてありがとう。次回も楽しみにしていてね。',
  forceTilt: true,
};
const model = {
  async generate() {
    return '今日はありがとう。綺麗に閉じすぎないでおくね。';
  },
};
describe('modulation gate integration', () => {
  it('falls back exactly when a modulator throws, times out or returns malformed data', async () => {
    const baseline = await createContaminator({ model }).contaminate(turn);
    for (const modulate of [
      async () => {
        throw new Error('broken');
      },
      () => new Promise<never>(() => {}),
      async () => null as never,
    ]) {
      const result = await createContaminator({
        model,
        modulator: { modulate },
        modulatorTimeoutMs: 5,
      }).contaminate(turn);
      expect(result).toEqual(baseline);
    }
  });
  it('does not invoke the brain for sincerity or rhythm skips', async () => {
    let calls = 0;
    const modulator = {
      async modulate() {
        calls++;
        return { intensityScale: 1.25 };
      },
    };
    const sincere = await createContaminator({ model, modulator }).contaminate({
      ...turn,
      messages: [
        {
          role: 'user',
          content: '最近つらい。相談したいことがあります。',
        },
      ],
    });
    expect(sincere.skipped?.reason).toBe('sincerity');
    expect(calls).toBe(0);
    const platform = await createContaminator({
      model,
      modulator,
      rhythm: { minPlatformTurns: 10 },
    }).contaminate({ ...turn, forceTilt: false });
    expect(platform.skipped).toBeDefined();
    expect(calls).toBe(0);
  });
  it('preserves protected content and quality fallback after modulation', async () => {
    const draft = 'URL https://example.com costs 123 yen. ```code```';
    const result = await createContaminator({
      model: {
        async generate() {
          return 'Changed everything';
        },
      },
      modulator: createVirtualNoiseBrain(),
      fallbackToDraftOnQualityFail: true,
      quality: { minScore: 1 },
    }).contaminate({ ...turn, draft });
    expect(result.text).toBe(draft);
    expect(result.modulation?.provider).toBe('virtual');
    expect(result.applied).toEqual([]);
  });
  it('keeps relationship allowlists authoritative with a hostile modulator', async () => {
    const result = await createContaminator({
      model,
      mode: 'chaotic',
      modulator: {
        async modulate(signals) {
          signals.context.personaVolatility = 100;
          signals.diagnosis.issues.length = 0;
          return {
            intensityScale: 100,
            interventionBias: { tsukkomi: 100, contrarian_reframe: 100 },
          };
        },
      },
    }).contaminate({ ...turn, relationshipCapital: 0 });
    const allowed = getAllowedInterventions('stranger');
    expect(result.plan.interventions.every((i) => allowed.has(i.kind))).toBe(
      true
    );
    expect(result.modulation?.intensityScale).toBe(1.25);
    expect(result.diagnosis.issues.length).toBeGreaterThan(0);
  });
});

describe('worker bridge', () => {
  it('queues input during loading and terminates timed-out work', async () => {
    const { createWorkerNoiseModulator, exposeNoiseBrainWorker } = await import(
      '../src/web/brainWorker'
    );
    class FakeWorker extends EventTarget {
      stopped = false;
      scope = new EventTarget();
      postMessage(data: unknown) {
        this.scope.dispatchEvent(new MessageEvent('message', { data }));
      }
      terminate() {
        this.stopped = true;
      }
    }
    const worker = new FakeWorker();
    let finish: (brain: ReturnType<typeof createVirtualNoiseBrain>) => void =
      () => {};
    exposeNoiseBrainWorker(
      {
        addEventListener: (_type, listener) =>
          worker.scope.addEventListener('message', listener as EventListener),
        postMessage: (data) =>
          worker.dispatchEvent(new MessageEvent('message', { data })),
      },
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const bridge = createWorkerNoiseModulator(
      worker as unknown as Worker,
      1000
    );
    const result = bridge.modulate(input);
    finish(createVirtualNoiseBrain({ captureReadout: true }));
    const bridged = await result;
    expect(bridged.provider).toBe('virtual');
    expect(bridged.readoutTrace).toHaveLength(24);
    bridge.dispose();
    expect(worker.stopped).toBe(true);
    await expect(bridge.modulate(input)).rejects.toThrow();
    const hanging = new FakeWorker();
    const deadline = createWorkerNoiseModulator(
      hanging as unknown as Worker,
      5
    );
    await expect(deadline.modulate(input)).rejects.toThrow();
    expect(hanging.stopped).toBe(true);
  });
});

describe('opt-in temporal activity', () => {
  it('records bounded frames that sum to the turn snapshot without changing modulation', async () => {
    const plain = createVirtualNoiseBrain({ neurons: 32 });
    const recording = createVirtualNoiseBrain({
      neurons: 32,
      captureActivity: true,
    });
    expect(await recording.modulate(input)).toEqual(
      await plain.modulate(input)
    );
    expect(plain.getActivityTrace().frames).toEqual([]);
    const trace = recording.getActivityTrace();
    expect(trace.frames).toHaveLength(24);
    const sum = new Uint32Array(32);
    for (const frame of trace.frames)
      for (let i = 0; i < frame.length; i++) sum[i] += frame[i];
    expect(sum).toEqual(recording.getActivitySnapshot());
    trace.frames[0].fill(255);
    expect(recording.getActivityTrace().frames[0]).not.toEqual(trace.frames[0]);
    await recording.modulate(input);
    expect(recording.getActivityTrace().frames).toHaveLength(24);
    const long = createVirtualNoiseBrain({
      neurons: 32,
      steps: 1000,
      captureActivity: true,
    });
    await long.modulate(input);
    expect(long.getActivityTrace().frames.length).toBeLessThanOrEqual(64);
    const longSum = new Uint32Array(32);
    for (const frame of long.getActivityTrace().frames)
      for (let i = 0; i < frame.length; i++) longSum[i] += frame[i];
    expect(longSum).toEqual(long.getActivitySnapshot());
  });
});

describe('compact temporal readout', () => {
  it('matches full-frame readout counts, survives the bridge, and bounds the last bin', async () => {
    const brain = createVirtualNoiseBrain({
      neurons: 32,
      steps: 129,
      captureActivity: true,
      captureReadout: true,
    });
    const modulation = await brain.modulate(input);
    const frames = modulation.readoutTrace ?? [];
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.length).toBeLessThanOrEqual(64);
    expect(frames[0].startStep).toBe(0);
    expect(frames.at(-1)?.endStep).toBe(129);
    const spikeSum = frames.reduce(
      (sum, f) => sum + f.activity * 8 * (f.endStep - f.startStep),
      0
    );
    expect(spikeSum).toBeCloseTo(
      brain
        .getActivitySnapshot()
        .slice(24)
        .reduce((a, b) => a + b, 0)
    );
    expect(normalizeModulation(modulation).readoutTrace).toEqual(frames);
    frames[0].axes[0] = 99;
    expect((await brain.modulate(input)).readoutTrace?.[0].axes[0]).not.toBe(
      99
    );
    const compact = createVirtualNoiseBrain({ captureReadout: true });
    expect((await compact.modulate(input)).readoutTrace?.length).toBe(24);
    expect(compact.getActivityTrace().frames).toHaveLength(0);
  });
});
