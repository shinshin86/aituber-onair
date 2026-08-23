import * as THREE from 'three';
import { CardPlane } from './CardPlane.js';
import type { ReadingPayload } from '../types.js';

const TABLE_Y = -3.9;

export class TarotScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private cards: CardPlane[] = [];
  private spreadGroup = new THREE.Group();
  private texCache = new Map<string, THREE.Texture>();
  private backTex: THREE.Texture | null = null;
  private flipTimer: number | null = null;
  private clearTimer: number | null = null;
  private camFrom = new THREE.Vector3();
  private camTo = new THREE.Vector3();
  private camCenter = new THREE.Vector3();
  private camT = 1;
  private baseCamDist = 10;
  private idleSpin = 0;
  private busy = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene.background = makeBackground();
    this.scene.fog = new THREE.Fog(0x07070f, 10, 26);
    this.scene.add(this.spreadGroup);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // Lighting: warm key, cool fill, golden rim
    const key = new THREE.DirectionalLight(0xfff2d8, 2.0);
    key.position.set(3, 5, 6);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.7);
    fill.position.set(-4, -2, -3);
    const rim = new THREE.SpotLight(0xffd27a, 40, 40, Math.PI / 5, 0.6);
    rim.position.set(0, 6, -4);
    this.scene.add(key, fill, rim, new THREE.AmbientLight(0x223344, 1.4));

    // Table surface under the cards
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 32),
      new THREE.MeshStandardMaterial({ map: makeTableTexture(), color: 0x141024, roughness: 0.85 })
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = TABLE_Y;
    this.scene.add(table);

    // Soft candle glow accents on the table
    for (const [x, c] of [[-7.5, 0xffb35c], [7.5, 0x9fb4ff]] as const) {
      const g = new THREE.PointLight(c, 12, 18, 2);
      g.position.set(x, TABLE_Y + 0.9, 1.5);
      this.scene.add(g);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private tick(): void {
    const dt = Math.min(0.05, this.clock.getDelta());
    let anySettling = false;
    for (const c of this.cards) {
      if (c.update(dt, this.clock.elapsedTime).settling) anySettling = true;
    }
    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 1.4);
      const e = easeInOutCubic(this.camT);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
      this.camera.lookAt(this.camCenter);
    } else if (!anySettling && this.cards.length > 0 && !this.busy) {
      this.idleSpin += dt * 0.06;
      this.camera.lookAt(this.camCenter);
      this.camera.position.x = this.camTo.x + Math.sin(this.idleSpin) * 0.9;
      this.camera.position.y = this.camTo.y + Math.cos(this.idleSpin * 0.7) * 0.25;
    }
    this.renderer.render(this.scene, this.camera);
  }

  async ensureBackTex(): Promise<THREE.Texture> {
    if (this.backTex) return this.backTex;
    this.backTex = await this.loadTexture('/cards/back.webp');
    return this.backTex;
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((res, rej) =>
      new THREE.TextureLoader().load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          res(t);
        },
        undefined,
        (err) => rej(new Error(` texture load failed: ${url}`))
      )
    );
  }

  private async cardFrontTexture(cardId: string): Promise<THREE.Texture> {
    const hit = this.texCache.get(cardId);
    if (hit) return hit;
    try {
      const tex = await this.loadTexture(`/cards/front/${cardId}.webp`);
      this.texCache.set(cardId, tex);
      return tex;
    } catch (e) {
      console.warn(`[tarot-viewer] texture missing for ${cardId}: ${e}`);
      // deterministic fallback: reuse any already-loaded texture or a plain white
      if (this.backTex) return this.backTex;
      const t = new THREE.DataTexture(new Uint8Array([220, 210, 170, 255]), 1, 1);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
  }

  getCardCount(): number {
    return this.cards.length;
  }

  /** Build and animate the spread for a reading payload. */
  async showReading(reading: ReadingPayload): Promise<void> {
    console.log(`[tarot-viewer] showReading: ${reading.spread_name} · ${reading.cards.length} cards`);
    this.clearTimers();
    this.clearCards();
    const backTex = await this.ensureBackTex();
    const scale = reading.card_scale;

    // Load textures up front so the deal doesn't hitch
    const texes: THREE.Texture[] = [];
    for (const c of reading.cards) texes.push(await this.cardFrontTexture(c.card_id));

    const planes = reading.cards.map((c, i) => new CardPlane(c, texes[i], backTex, scale));
    for (const p of planes) this.spreadGroup.add(p.group);
    this.cards = planes;

    // Center the spread at the origin for a stable camera.
    // Los bounds incluyen ~0.9 u extra por debajo para las etiquetas de nombre.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of reading.cards) {
      minX = Math.min(minX, c.x * scale);
      maxX = Math.max(maxX, c.x * scale);
      minY = Math.min(minY, c.y * scale);
      maxY = Math.max(maxY, c.y * scale);
    }
    const labelPad = 0.9; // etiquetas bajo cada carta
    const center = new THREE.Vector3((minX + maxX) / 2, (minY - labelPad + maxY) / 2, 0);
    this.spreadGroup.position.set(-center.x, -center.y, 0);

    const fovY = (this.camera.fov * Math.PI) / 180;
    // Márgenes holgados para que ninguna carta ni etiqueta quede cortada en OBS
    const spanX = maxX - minX + 4.0;
    const spanY = maxY - (minY - labelPad) + 3.2;
    const distX = spanX / (2 * Math.tan(fovY / 2) * this.camera.aspect);
    const distY = spanY / (2 * Math.tan(fovY / 2));
    this.baseCamDist = Math.max(6, Math.min(20, Math.max(distX, distY)) * 1.06);

    this.camFrom.copy(this.camera.position);
    this.camTo.set(0, 0.1, this.baseCamDist);
    this.camCenter.set(0, 0, 0);
    this.camT = 0;
    this.idleSpin = 0;

    // Staggered deal + flip: bigger spreads deal faster
    const step = reading.cards.length > 24 ? 120 : reading.cards.length > 12 ? 260 : 520;
    this.busy = true;
    let busyUntil = 0;
    planes.forEach((p, i) => {
      setTimeout(() => {
        p.startFlip(0);
        busyUntil = Math.max(busyUntil, performance.now() + 900);
      }, 350 + i * step);
    });
    const totalMs = 350 + (reading.cards.length - 1) * step + 900;
    this.flipTimer = window.setTimeout(() => {
      this.flipTimer = null;
      for (const p of planes) p.showLabel();
    }, totalMs);
    // keep "busy" (camera still) until flips are done, tracked via a watchdog
    const watchdog = window.setInterval(() => {
      if (performance.now() > busyUntil) {
        this.busy = false;
        clearInterval(watchdog);
      }
    }, 200);
    void watchdog;

    // Auto-clear after 3 minutes so the next gift reading can show
    this.clearTimer = window.setTimeout(() => this.reset(), 180_000);
  }

  markDone(): void {
    if (this.clearTimer) { clearTimeout(this.clearTimer); this.clearTimer = null; }
    for (const p of this.cards) p.showLabel();
  }

  reset(): void {
    this.clearTimers();
    this.idleSpin = 0;
    this.clearCards();
    this.busy = false;
  }

  private clearTimers(): void {
    if (this.flipTimer) { clearTimeout(this.flipTimer); this.flipTimer = null; }
    if (this.clearTimer) { clearTimeout(this.clearTimer); this.clearTimer = null; }
  }

  private clearCards(): void {
    for (const c of this.cards) {
      this.spreadGroup.remove(c.group);
      c.dispose();
    }
    this.cards = [];
  }

  dispose(): void {
    this.reset();
    this.renderer.dispose();
  }
}

function makeBackground(): THREE.Texture {
  const cnv = document.createElement('canvas');
  cnv.width = 16; cnv.height = 512;
  const ctx = cnv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0a0a18');
  g.addColorStop(0.55, '#070710');
  g.addColorStop(1, '#030306');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(cnv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeTableTexture(): THREE.Texture {
  const s = 256;
  const cnv = document.createElement('canvas');
  cnv.width = s; cnv.height = s;
  const ctx = cnv.getContext('2d')!;
  ctx.fillStyle = '#171228';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(120,100,180,0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= s; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cnv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 7);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
