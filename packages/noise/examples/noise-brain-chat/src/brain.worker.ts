import { createVirtualNoiseBrain, type NoiseBrain } from '../../../src/index';
import { loadMaleCnsNoiseBrain } from '../../../src/web';
import type { Geometry, Request, Reply } from './protocol';

const scope = self as unknown as {
  onmessage: (event: MessageEvent<Request>) => void;
  postMessage(value: Reply, transfer?: Transferable[]): void;
};
let brain: NoiseBrain | undefined;
let queue = Promise.resolve();
scope.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      if (data.type === 'init') {
        brain =
          data.backend === 'virtual'
            ? createVirtualNoiseBrain({
                seed: 42,
                captureReadout: true,
                retainState: true,
                steps: 32,
                captureActivity: true,
              })
            : await loadMaleCnsNoiseBrain({
                manifestUrl: data.manifestUrl,
                seed: 42,
                captureReadout: true,
                retainState: true,
                steps: 32,
                captureActivity: true,
              });
        const ids = brain.getBodyIds();
        let positions: Float32Array;
        let types: string[];
        let groups: string[];
        if (data.backend === 'malecns') {
          const url = new URL(data.manifestUrl, self.location.href);
          const [p, m] = await Promise.all([
            fetch(new URL('soma-positions.f32', url)),
            fetch(new URL('metadata.json', url)),
          ]);
          if (!p.ok || !m.ok)
            throw new Error(
              '可視化用の座標・metadataがありません。データを準備してください。'
            );
          positions = new Float32Array(await p.arrayBuffer());
          const metadata = (await m.json()) as {
            dictionary: string[];
            neurons: number[][];
          };
          if (
            positions.length !== ids.length * 3 ||
            metadata.neurons.length !== ids.length
          )
            throw new Error('座標・metadataとグラフの件数が一致しません。');
          types = metadata.neurons.map(
            (row) => metadata.dictionary[row[0]] || '未注釈'
          );
          groups = metadata.neurons.map(
            (row) => metadata.dictionary[row[1]] || '未注釈'
          );
        } else {
          positions = new Float32Array(ids.length * 3);
          types = [];
          groups = [];
          // A synthetic bilateral layout, not fly anatomy or actual edge geometry.
          for (let i = 0; i < ids.length; i++) {
            const angle = i * 2.399963229728653;
            const r = Math.sqrt(((i * 73) % ids.length) / ids.length);
            positions[i * 3] =
              (i % 2 ? -0.56 : 0.56) + Math.cos(angle) * r * 0.49;
            positions[i * 3 + 1] = Math.sin(angle) * r * 0.7;
            positions[i * 3 + 2] = Math.sin(i * 1.71) * r * 0.4;
            const group =
              i < ids.length / 4
                ? 'input'
                : i >= ids.length * 0.75
                  ? 'readout'
                  : 'reservoir';
            groups.push(group);
            types.push(group === 'input' ? `channel-${i % 6}` : group);
          }
        }
        const geometry: Geometry = {
          positions,
          ids,
          types,
          groups,
          neuronCount: brain.neuronCount,
          edgeCount: brain.edgeCount,
          provider: data.backend,
        };
        scope.postMessage({ type: 'ready', geometry }, [
          positions.buffer,
          ids.buffer,
        ]);
      } else if (data.type === 'reset') {
        brain?.reset();
      } else {
        if (!brain) throw new Error('脳を読み込んでください。');
        const start = performance.now();
        const modulation = await brain.modulate(data.input);
        const elapsedMs = performance.now() - start;
        const counts = brain.getActivitySnapshot();
        const trace = brain.getActivityTrace();
        scope.postMessage(
          { type: 'result', id: data.id, modulation, counts, trace, elapsedMs },
          [counts.buffer, ...trace.frames.map((frame) => frame.buffer)]
        );
      }
    } catch (error) {
      scope.postMessage({
        type: 'error',
        id: data.type === 'run' ? data.id : undefined,
        message:
          error instanceof Error ? error.message : '脳の処理に失敗しました。',
      });
    }
  });
};
