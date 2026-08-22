import * as THREE from 'three';
import type { ReadingCardPayload } from '../types.js';

// Card geometry: width 1.0 world units, aspect 1 : 1.72 (standard tarot)
export const CARD_W = 1.0;
export const CARD_H = 1.72;

export type CardPhase = 'deal' | 'flip' | 'settled';

export class CardPlane {
  readonly group = new THREE.Group();
  readonly inner = new THREE.Group(); // flip happens on this pivot
  phase: CardPhase = 'deal';

  private front: THREE.Mesh;
  private back: THREE.Mesh;
  private label: THREE.Mesh | null = null;
  private labelOn = false;
  private flipProgress = 0; // 0 = face-down, 1 = face-up
  private flipTarget = 0;
  private target = new THREE.Vector3();
  private targetRot = 0;
  private from = new THREE.Vector3(0, 4.2, 2.6);
  private to = new THREE.Vector3();
  private dealT = 1;
  private wobble = 0;
  private wobbleAmp = 0;

  private static texLoader = new THREE.TextureLoader();

  constructor(
    private card: ReadingCardPayload,
    private frontTex: THREE.Texture,
    private backTex: THREE.Texture,
    private baseScale: number
  ) {
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    this.front = new THREE.Mesh(geo, frontMat);
    this.back = new THREE.Mesh(geo, backMat);
    this.back.rotation.y = Math.PI; // face-down shows the back texture
    this.inner.add(this.front, this.back);

    // Gold frame around the card
    const frameGeo = new THREE.PlaneGeometry(CARD_W * 1.045, CARD_H * 1.03);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6d1f, roughness: 0.4, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.004;
    this.inner.add(frame);
    // Dark backing plate (readable from the back side too during flips)
    const plate = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9 }));
    plate.position.z = -0.008;
    plate.rotation.y = Math.PI;
    this.inner.add(plate);

    this.group.add(this.inner);
    this.inner.rotation.y = Math.PI; // start face-down (back toward camera)
    this.group.position.copy(this.from);
    this.settleTarget();
    this.target.copy(this.to);
  }

  /** Final resting position from the spread payload. */
  settleTarget(): void {
    this.to.set(this.card.x * this.baseScale, this.card.y * this.baseScale, 0);
    this.targetRot = this.card.rot;
    this.target.copy(this.to);
  }

  startFlip(delayMs: number): void {
    this.flipTarget = 1;
    this.phase = 'flip';
    void delayMs;
  }

  showLabel(): void {
    if (this.labelOn) return;
    this.labelOn = true;
    const cnv = document.createElement('canvas');
    cnv.width = 256;
    cnv.height = 96;
    const ctx = cnv.getContext('2d')!;
    ctx.fillStyle = 'rgba(8, 8, 16, 0.82)';
    roundRect(ctx, 2, 2, 252, 92, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,0.9)';
    ctx.lineWidth = 3;
    roundRect(ctx, 2, 2, 252, 92, 14);
    ctx.stroke();
    ctx.fillStyle = '#f0e6c8';
    ctx.font = '600 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const name = this.card.card_name + (this.card.reversed ? ' ◀' : '');
    ctx.fillText(name, 128, 50, 236);
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W * 1.12, 0.42),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
    );
    labelMesh.position.set(0, -CARD_H / 2 - 0.34, 0.02);
    labelMesh.renderOrder = 10;
    this.group.add(labelMesh);
    this.label = labelMesh;
  }

  update(dt: number, elapsed: number): { settling: boolean } {
    // --- deal interpolation ---
    if (this.dealT < 1) {
      this.dealT = Math.min(1, this.dealT + dt / 0.9);
      const e = easeOutBack(this.dealT);
      this.group.position.lerpVectors(this.from, this.target, e);
    } else {
      // gentle hover wobble once settled
      this.wobble += dt * 1.4;
      this.group.position.y = this.target.y + Math.sin(this.wobble + this.wobbleAmp) * 0.02;
      if (this.phase === 'flip') {
        this.group.position.x = this.target.x + Math.sin(elapsed * 2) * 0.01;
      }
    }
    // --- flip animation ---
    if (this.flipTarget > this.flipProgress) {
      this.flipProgress = Math.min(this.flipTarget, this.flipProgress + dt * 1.6);
      // face-down (PI) → face-up (0)
      this.inner.rotation.y = Math.PI - easeInOutQuad(this.flipProgress) * Math.PI;
      if (this.flipProgress >= 1) {
        this.phase = 'settled';
        this.group.position.y = this.target.y;
      }
    }
    // base rotation (spread tilt) + flip on the inner pivot
    const settling = this.dealT < 1 || this.flipProgress < this.flipTarget;
    this.group.rotation.z = this.dealT < 1 ? (1 - easeOutBack(this.dealT)) * 0.6 + this.targetRot * this.dealT : this.targetRot;
    return { settling };
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
