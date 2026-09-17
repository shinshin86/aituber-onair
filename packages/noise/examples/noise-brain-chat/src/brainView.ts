import type { Geometry } from './protocol';

export class BrainView {
  private context: CanvasRenderingContext2D;
  private geometry?: Geometry;
  private normalized = new Float32Array();
  private visible: number[] = [];
  private counts = new Uint32Array();
  private frame?: Uint8Array;
  private angle = 0;
  private dragX?: number;
  private observer: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2Dを利用できません。');
    this.context = context;
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(canvas);
    canvas.addEventListener('pointerdown', (e) => {
      this.dragX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.dragX === undefined) return;
      const delta = e.clientX - this.dragX;
      this.angle += delta * 0.006;
      this.dragX = e.clientX;
      this.draw();
    });
    canvas.addEventListener('pointerup', () => {
      this.dragX = undefined;
    });
    canvas.addEventListener('pointercancel', () => {
      this.dragX = undefined;
    });
  }
  clear() {
    this.geometry = undefined;
    this.visible = [];
    this.draw();
  }
  setGeometry(geometry: Geometry) {
    this.geometry = geometry;
    this.angle = 0;
    this.normalized = new Float32Array(geometry.positions.length);
    const min = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ];
    const max = [
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    this.visible = [];
    for (let i = 0; i < geometry.ids.length; i++) {
      const xyz = geometry.positions.subarray(i * 3, i * 3 + 3);
      if (!xyz.every(Number.isFinite)) continue;
      this.visible.push(i);
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], xyz[a]);
        max[a] = Math.max(max[a], xyz[a]);
      }
    }
    const span = Math.max(...max.map((v, a) => v - min[a])) || 1;
    for (const i of this.visible)
      for (let a = 0; a < 3; a++)
        this.normalized[i * 3 + a] =
          ((geometry.positions[i * 3 + a] - (min[a] + max[a]) / 2) / span) * 2;
    this.counts = new Uint32Array(geometry.ids.length);
    this.frame = undefined;
    this.draw();
  }
  get positionedCount() {
    return this.visible.length;
  }
  setActivity(counts: Uint32Array, frame?: Uint8Array) {
    this.counts = counts;
    this.frame = frame;
    this.draw();
  }
  resetView() {
    this.angle = 0;
    this.draw();
  }
  private draw() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = r.width * dpr;
    this.canvas.height = r.height * dpr;
    const c = this.context;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, r.width, r.height);
    c.strokeStyle = '#243532';
    c.lineWidth = 0.5;
    for (let x = 24; x < r.width; x += 36) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, r.height);
      c.stroke();
    }
    for (let y = 24; y < r.height; y += 36) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(r.width, y);
      c.stroke();
    }
    if (!this.geometry) {
      c.fillStyle = '#a1b2ab';
      c.font = '14px sans-serif';
      c.textAlign = 'center';
      c.fillText(
        '脳を読み込むと、ここに神経活動を表示します',
        r.width / 2,
        r.height / 2
      );
      return;
    }
    const scale = Math.min(r.width * 0.39, r.height * 0.4);
    const step = Math.max(1, Math.ceil(this.visible.length / 6500));
    const project = (i: number) => {
      const x = this.normalized[i * 3];
      const y = this.normalized[i * 3 + 1];
      const z = this.normalized[i * 3 + 2];
      return {
        i,
        x:
          r.width / 2 +
          (x * Math.cos(this.angle) + z * Math.sin(this.angle)) * scale,
        y:
          r.height / 2 +
          y * scale * (this.geometry?.provider === 'virtual' ? -1 : 1),
      };
    };
    const drawPoint = (i: number, active: number) => {
      const p = project(i);
      const readout = ['readout', 'descending_neuron'].includes(
        this.geometry?.groups[i] ?? ''
      );
      c.fillStyle = active ? (readout ? '#ff93c8' : '#d7fc84') : '#58796d';
      c.globalAlpha = active ? Math.min(1, 0.65 + active * 0.08) : 0.5;
      const radius = active
        ? (this.geometry?.provider === 'virtual' ? 2.8 : 2) +
          Math.min(2, active * 0.25)
        : 1;
      c.beginPath();
      c.arc(p.x, p.y, radius, 0, Math.PI * 2);
      c.fill();
    };
    for (let j = 0; j < this.visible.length; j += step)
      drawPoint(this.visible[j], 0);
    for (const i of this.visible) {
      const active = this.frame ? this.frame[i] : this.counts[i];
      if (active) drawPoint(i, active);
    }
    c.globalAlpha = 1;
  }
}
