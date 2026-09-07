import * as THREE from "three";
import { palette } from "../theme";

const STORAGE_KEY = "mmd-arcade-ghost-v1";
const LANES = [-2.2, 0, 2.2] as const;
export const LANE_NAMES = ["ACH", "Cards", "USDC"] as const;
const TRACK_LEN = 260;
const BASE_SPEED = 22;
const TIME_CAP = 55;
const LANE_LERP = 12;
const TRAILER_S = 8;

export type ArcadePhase = "countdown" | "running" | "won" | "dnf" | "aborted";

export interface GhostFrame {
  t: number;
  x: number;
  z: number;
}

export interface GhostRecord {
  time: number;
  frames: GhostFrame[];
}

interface Hazard {
  mesh: THREE.Mesh;
  lane: number;
  z: number;
  kind: "block" | "boost";
  hit: boolean;
}

const HAZARD_COPY = [
  "DEPEG",
  "COMPLIANCE",
  "ACH HOLD",
  "CARD HOLD",
  "KYC QUEUE",
] as const;

const BOOST_COPY = ["USDC CLEAR", "T+0", "RTP"] as const;

function labelTexture(text: string, danger: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.fillStyle = "#11100e";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = danger ? "#c45a3a" : "#d0ea66";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.fillStyle = danger ? "#c45a3a" : "#d0ea66";
  ctx.font = "600 42px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 80);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadGhost(): GhostRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GhostRecord;
    if (!parsed.time || !Array.isArray(parsed.frames)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveGhost(record: GhostRecord): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function bestGhostTime(): number | null {
  return loadGhost()?.time ?? null;
}

export class SettlementRun {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 180);
  phase: ArcadePhase = "countdown";
  time = 0;
  countdown = 3;
  readonly ghostBest = loadGhost();
  private lane = 1;
  private x = 0;
  private z = 0;
  private speed = BASE_SPEED;
  private boostT = 0;
  private slowT = 0;
  private readonly packet: THREE.Mesh;
  private readonly ghost: THREE.Mesh;
  private readonly hazards: Hazard[] = [];
  private readonly recorded: GhostFrame[] = [];
  private lastResult: number | null = null;

  constructor() {
    this.scene.background = new THREE.Color(0x1a1c17);
    this.scene.fog = new THREE.Fog(0x1a1c17, 40, 110);

    const hemi = new THREE.HemisphereLight(0xf5f5f7, 0x11100e, 0.55);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xf5f5f7, 1.25);
    key.position.set(6, 14, 8);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight(0x2a2c26, 0.28));

    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 0.2, TRACK_LEN + 20),
      new THREE.MeshStandardMaterial({ color: 0x24261f, roughness: 0.88 }),
    );
    trough.position.set(0, -0.2, TRACK_LEN / 2);
    this.scene.add(trough);

    const railMat = new THREE.MeshStandardMaterial({
      color: palette.lime,
      emissive: palette.lime,
      emissiveIntensity: 0.55,
    });
    for (const x of [-3.3, 3.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, TRACK_LEN), railMat);
      rail.position.set(x, 0.06, TRACK_LEN / 2);
      this.scene.add(rail);
    }
    for (const x of LANES) {
      const lane = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.02, TRACK_LEN),
        new THREE.MeshStandardMaterial({
          color: 0x8a8274,
          emissive: 0x3a3224,
          emissiveIntensity: 0.2,
        }),
      );
      lane.position.set(x, 0.02, TRACK_LEN / 2);
      this.scene.add(lane);
    }

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x161812,
      roughness: 0.8,
    });
    for (const x of [-4.8, 4.8]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, TRACK_LEN), wallMat);
      wall.position.set(x, 1.1, TRACK_LEN / 2);
      this.scene.add(wall);
    }

    LANE_NAMES.forEach((name, i) => {
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 0.55),
        new THREE.MeshBasicMaterial({ map: labelTexture(name, false) }),
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(LANES[i], 0.04, 8);
      this.scene.add(mark);
    });

    for (let i = 12; i < TRACK_LEN - 8; i += 18) {
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.45),
        new THREE.MeshBasicMaterial({
          color: palette.lime,
          transparent: true,
          opacity: 0.28,
        }),
      );
      tag.position.set(-4.55, 1.4, i);
      tag.rotation.y = Math.PI / 2;
      this.scene.add(tag);
    }

    this.spawnHazards();

    const finish = new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.2, 0.3),
      new THREE.MeshStandardMaterial({
        color: palette.lime,
        emissive: palette.lime,
        emissiveIntensity: 0.65,
      }),
    );
    finish.position.set(0, 1.6, TRACK_LEN);
    this.scene.add(finish);

    const finishLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.1),
      new THREE.MeshBasicMaterial({
        map: labelTexture("T+0  SETTLED", false),
      }),
    );
    finishLabel.position.set(0, 3.4, TRACK_LEN + 0.2);
    this.scene.add(finishLabel);

    this.packet = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 1.1),
      new THREE.MeshStandardMaterial({
        color: palette.lime,
        emissive: palette.lime,
        emissiveIntensity: 1.05,
        roughness: 0.3,
      }),
    );
    this.scene.add(this.packet);

    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 1.1),
      new THREE.MeshStandardMaterial({
        color: palette.cream,
        emissive: palette.cream,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.35,
        roughness: 0.5,
      }),
    );
    this.ghost.visible = Boolean(this.ghostBest);
    this.scene.add(this.ghost);

    this.resetRun();
  }

  private spawnHazards(): void {
    let z = 16;
    let i = 0;
    while (z < TRACK_LEN - 18) {
      const blocked = new Set<number>();
      const count = i === 0 ? 2 : i % 3 === 0 ? 2 : 1;
      if (i === 0) {
        blocked.add(0);
        blocked.add(1);
      } else {
        while (blocked.size < count) {
          blocked.add(Math.floor(pseudo(z + blocked.size * 9) * 3));
        }
      }
      for (const lane of blocked) {
        const scripted = i === 0;
        const danger = scripted ? true : pseudo(z + lane * 17) > 0.22;
        const copy = scripted
          ? lane === 0
            ? "DEPEG"
            : "COMPLIANCE"
          : danger
            ? HAZARD_COPY[Math.floor(pseudo(z + 3) * HAZARD_COPY.length)]
            : BOOST_COPY[Math.floor(pseudo(z + 5) * BOOST_COPY.length)];
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 1.05, 0.55),
          new THREE.MeshStandardMaterial({
            color: danger ? palette.danger : palette.ok,
            emissive: danger ? palette.danger : palette.lime,
            emissiveIntensity: 0.5,
          }),
        );
        mesh.position.set(LANES[lane], 0.55, z);
        this.scene.add(mesh);
        const badge = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 0.4),
          new THREE.MeshBasicMaterial({ map: labelTexture(copy, danger) }),
        );
        badge.position.set(LANES[lane], 1.25, z);
        this.scene.add(badge);
        this.hazards.push({
          mesh,
          lane,
          z,
          kind: danger ? "block" : "boost",
          hit: false,
        });
      }
      if (i === 0) {
        const boostZ = z + 10;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 1.05, 0.55),
          new THREE.MeshStandardMaterial({
            color: palette.ok,
            emissive: palette.lime,
            emissiveIntensity: 0.5,
          }),
        );
        mesh.position.set(LANES[2], 0.55, boostZ);
        this.scene.add(mesh);
        const badge = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 0.4),
          new THREE.MeshBasicMaterial({ map: labelTexture("USDC CLEAR", false) }),
        );
        badge.position.set(LANES[2], 1.25, boostZ);
        this.scene.add(badge);
        this.hazards.push({
          mesh,
          lane: 2,
          z: boostZ,
          kind: "boost",
          hit: false,
        });
      }
      z += 11 + (i % 4) * 2.5;
      i += 1;
    }
  }

  resetRun(): void {
    this.phase = "countdown";
    this.time = 0;
    this.countdown = 3;
    this.lane = 2;
    this.x = LANES[2];
    this.z = 0;
    this.speed = BASE_SPEED;
    this.boostT = 0;
    this.slowT = 0;
    this.recorded.length = 0;
    this.lastResult = null;
    for (const h of this.hazards) {
      h.hit = false;
      h.mesh.visible = true;
    }
    this.syncBodies();
  }

  shift(dir: -1 | 1): void {
    if (this.phase !== "running") return;
    this.lane = THREE.MathUtils.clamp(this.lane + dir, 0, 2);
  }

  abort(): void {
    this.phase = "aborted";
  }

  update(dt: number): ArcadePhase {
    if (this.phase === "countdown") {
      this.countdown -= dt;
      this.syncBodies();
      if (this.countdown <= 0) this.phase = "running";
      return this.phase;
    }
    if (this.phase !== "running") return this.phase;

    this.time += dt;
    if (this.boostT > 0) this.boostT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    const trailer = this.time < TRAILER_S ? 0.82 : 1;
    const mul =
      trailer * (this.boostT > 0 ? 1.28 : 1) * (this.slowT > 0 ? 0.58 : 1);
    this.speed = BASE_SPEED * mul;
    this.z += this.speed * dt;
    this.x = THREE.MathUtils.damp(this.x, LANES[this.lane], LANE_LERP, dt);

    this.recorded.push({ t: this.time, x: this.x, z: this.z });
    this.collide();
    this.syncBodies();
    this.updateGhost();

    if (this.z >= TRACK_LEN) {
      this.phase = "won";
      this.lastResult = this.time;
      this.maybeSaveGhost();
    } else if (this.time >= TIME_CAP) {
      this.phase = "dnf";
    }
    return this.phase;
  }

  resultTime(): number | null {
    return this.lastResult;
  }

  countdownLabel(): string {
    return String(Math.max(1, Math.ceil(this.countdown)));
  }

  get laneIndex(): number {
    return this.lane;
  }

  coachLine(): string {
    if (this.phase === "countdown") return "Three rails. One settlement.";
    if (this.time < 2.2) return "ACH waits. Cards tax.";
    if (this.time < 5) return "USDC clears T+0. Stay on the lime rail.";
    if (this.time < TRAILER_S) return "Dodge depeg. Dodge compliance.";
    return "";
  }

  dispose(): void {
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => disposeMat(m));
      else if (mat) disposeMat(mat);
    });
  }

  private collide(): void {
    for (const h of this.hazards) {
      if (h.hit) continue;
      if (h.lane !== this.lane) continue;
      if (Math.abs(h.z - this.z) > 0.9) continue;
      h.hit = true;
      h.mesh.visible = false;
      if (h.kind === "block") this.slowT = 0.7;
      else this.boostT = 0.85;
    }
  }

  private maybeSaveGhost(): void {
    if (this.lastResult == null) return;
    if (this.ghostBest && this.lastResult >= this.ghostBest.time) return;
    const frames = downsample(this.recorded);
    saveGhost({ time: this.lastResult, frames });
  }

  private updateGhost(): void {
    if (!this.ghostBest) return;
    const frames = this.ghostBest.frames;
    if (!frames.length) return;
    const t = this.time;
    let i = 0;
    while (i < frames.length - 1 && frames[i + 1].t < t) i += 1;
    const a = frames[i];
    const b = frames[Math.min(i + 1, frames.length - 1)];
    const span = Math.max(0.0001, b.t - a.t);
    const u = THREE.MathUtils.clamp((t - a.t) / span, 0, 1);
    this.ghost.position.set(
      THREE.MathUtils.lerp(a.x, b.x, u),
      0.55,
      THREE.MathUtils.lerp(a.z, b.z, u),
    );
  }

  private syncBodies(): void {
    this.packet.position.set(this.x, 0.55, this.z);
    this.camera.position.set(this.x * 0.35, 3.4, this.z - 7.2);
    this.camera.lookAt(this.x, 0.8, this.z + 8);
  }
}

function disposeMat(mat: THREE.Material): void {
  const m = mat as THREE.MeshBasicMaterial;
  if (m.map) m.map.dispose();
  mat.dispose();
}

function downsample(frames: GhostFrame[]): GhostFrame[] {
  if (frames.length <= 180) return frames.slice();
  const step = Math.ceil(frames.length / 180);
  const out: GhostFrame[] = [];
  for (let i = 0; i < frames.length; i += step) out.push(frames[i]);
  const last = frames[frames.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function pseudo(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
