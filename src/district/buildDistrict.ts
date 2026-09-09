import * as THREE from "three";
import { HEADLINES, MARQUEE, SPONSORS, SPONSOR_LINES, STOREFRONTS, palette } from "../theme";
import type { Claim, StorefrontId } from "../types";

export interface Door {
  id: StorefrontId;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  sign: THREE.Mesh;
  signIdle: THREE.Material;
  signHot: THREE.Material;
  hit: THREE.Object3D[];
}

export interface District {
  group: THREE.Group;
  colliders: THREE.Box3[];
  doors: Door[];
  spawn: THREE.Vector3;
  spawnYaw: number;
  update(dt: number, t: number): void;
  setClaims(claims: Claim[]): void;
}

const BUILDING_W = 9.4;
const BUILDING_H = 8.6;
const BUILDING_D = 6.2;
const FACE = BUILDING_D / 2; // front faces sit at |z| = 8.4 - 3.1 = 5.3
const ROW_Z = 8.4;

const SANS = "Aspekta, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "'Instrument Serif', 'FK Roman Standard', Georgia, serif";

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function redraw(
  tex: THREE.CanvasTexture,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const canvas = tex.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx, canvas.width, canvas.height);
  tex.needsUpdate = true;
}

function pseudo(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = word;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    const last = lines[maxLines - 1].replace(/[.,;:]?$/, "");
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/* ---------- textures ---------- */

/** Pre-war upper facade: stone courses, tall windows with lintels, a few lit. */
function facadeTexture(seed: number, cols: number): THREE.CanvasTexture {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#1b1b18";
    ctx.fillRect(0, 0, w, h);
    // stone courses
    ctx.strokeStyle = "rgba(245,245,247,0.045)";
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const rows = 2;
    const padX = 60;
    const padY = 46;
    const gapX = 54;
    const cellW = (w - padX * 2 - gapX * (cols - 1)) / cols;
    const cellH = 150;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (cellW + gapX);
        const y = padY + r * (cellH + 60);
        const n = pseudo(seed * 7 + r * 31 + c * 13);
        // lintel + sill
        ctx.fillStyle = "#31302b";
        ctx.fillRect(x - 10, y - 14, cellW + 20, 12);
        ctx.fillRect(x - 8, y + cellH + 2, cellW + 16, 8);
        // glass
        ctx.fillStyle = n < 0.32 ? "rgba(245,245,247,0.3)" : n < 0.5 ? "rgba(245,245,247,0.12)" : "#141412";
        ctx.fillRect(x, y, cellW, cellH);
        // sash
        ctx.fillStyle = "rgba(17,16,14,0.8)";
        ctx.fillRect(x + cellW / 2 - 2, y, 4, cellH);
        ctx.fillRect(x, y + cellH / 2 - 2, cellW, 4);
        if (n < 0.32) {
          // a blind, a lamp
          ctx.fillStyle = "rgba(245,245,247,0.22)";
          ctx.fillRect(x + 6, y + 6, cellW - 12, 18);
        }
      }
    }
    // fire escape on some facades
    if (seed % 2 === 0) {
      ctx.strokeStyle = "rgba(167,165,160,0.35)";
      ctx.lineWidth = 3;
      const fx = w - 150;
      ctx.strokeRect(fx, 30, 120, h - 60);
      for (let y = 40; y < h - 40; y += 24) {
        ctx.beginPath();
        ctx.moveTo(fx, y);
        ctx.lineTo(fx + 120, y + 14);
        ctx.stroke();
      }
    }
  });
}

/** Theater marquee board: stacked caps, serif subline, LIVE tag. */
function marqueeTexture(id: StorefrontId, subtitle: string, lit: boolean): THREE.CanvasTexture {
  const [a, b] = MARQUEE[id];
  return canvasTexture(1024, 320, (ctx, w, h) => {
    ctx.fillStyle = lit ? "#1b1b18" : "#141412";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = lit ? "#d0ea66" : "rgba(245,245,247,0.5)";
    ctx.lineWidth = lit ? 8 : 5;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = "rgba(245,245,247,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.fillStyle = lit ? "#f5f5f7" : "#d9d8d4";
    ctx.textBaseline = "alphabetic";
    ctx.font = `500 112px ${SANS}`;
    ctx.fillText(a, 56, 142);
    ctx.font = `500 112px ${SANS}`;
    ctx.fillText(b, 56, 258);
    // LIVE tag
    ctx.fillStyle = lit ? "#d0ea66" : "#a7a5a0";
    ctx.font = `500 34px ${SANS}`;
    ctx.fillText("LIVE", w - 150, 92);
    ctx.fillStyle = lit ? "#d0ea66" : "#8b8b9e";
    ctx.beginPath();
    ctx.arc(w - 170, 82, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a7a5a0";
    ctx.font = `italic 40px ${SERIF}`;
    ctx.textAlign = "right";
    ctx.fillText(subtitle, w - 56, 258);
    ctx.textAlign = "left";
  });
}

/** Ground-floor window board per door: teaches before you enter. */
function windowBoard(id: StorefrontId): THREE.CanvasTexture {
  return canvasTexture(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = "#0f0f0d";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(245,245,247,0.14)";
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = `500 26px ${SANS}`;
    const kicker = {
      "stablecoin-shop": "PRICE BOARD · 24 / 7",
      "rails-station": "DEPARTURES · SATURDAY 02:00",
      "policy-desk": "DESK RULES",
      "agent-pay-arcade": "TONIGHT · SETTLEMENT RUN",
    }[id];
    ctx.fillText(kicker, 64, 90);
    ctx.fillStyle = "#f5f5f7";
    if (id === "stablecoin-shop") {
      ctx.font = `400 220px ${SERIF}`;
      ctx.fillText("$1.000", 60, 330);
      ctx.fillStyle = "#d0ea66";
      ctx.font = `500 30px ${SANS}`;
      ctx.fillText("PEG HELD", 64, 400);
      ctx.fillStyle = "#a7a5a0";
      ctx.font = `400 34px ${SANS}`;
      ctx.fillText("Redemptions open. Reserves answer.", 64, 470);
      ctx.fillText("Banks: closed until Monday.", 64, 520);
    } else if (id === "rails-station") {
      const rows: Array<[string, string, string]> = [
        ["ACH", "MON 09:00", "cents"],
        ["CARDS", "NOW", "2.9% + FX"],
        ["USDC", "NOW · T+0", "pennies"],
      ];
      rows.forEach(([rail, when, fee], i) => {
        const y = 190 + i * 130;
        ctx.fillStyle = i === 2 ? "#d0ea66" : "#f5f5f7";
        ctx.font = `500 72px ${SANS}`;
        ctx.fillText(rail, 64, y);
        ctx.fillStyle = i === 2 ? "#d0ea66" : "#a7a5a0";
        ctx.font = `500 44px ${SANS}`;
        ctx.fillText(when, 400, y);
        ctx.fillStyle = "#8b8b9e";
        ctx.font = `italic 44px ${SERIF}`;
        ctx.fillText(fee, 720, y);
        ctx.fillStyle = "rgba(245,245,247,0.12)";
        ctx.fillRect(64, y + 30, w - 128, 2);
      });
    } else if (id === "policy-desk") {
      ctx.font = `400 96px ${SERIF}`;
      ctx.fillText("Banks recall.", 64, 220);
      ctx.fillText("Chains do not.", 64, 330);
      ctx.fillStyle = "#d0ea66";
      ctx.font = `500 34px ${SANS}`;
      ctx.fillText("1. SIMULATE   2. READ   3. SEND", 64, 430);
      ctx.fillStyle = "#a7a5a0";
      ctx.font = `400 34px ${SANS}`;
      ctx.fillText("There is no undo button on this rail.", 64, 510);
    } else {
      ctx.font = `500 120px ${SANS}`;
      ctx.fillText("3 RAILS", 64, 240);
      ctx.fillText("1 SETTLEMENT", 64, 370);
      ctx.fillStyle = "#d0ea66";
      ctx.font = `500 34px ${SANS}`;
      ctx.fillText("STAY ON THE LIME RAIL · DODGE DEPEG", 64, 450);
      ctx.fillStyle = "#a7a5a0";
      ctx.font = `italic 44px ${SERIF}`;
      ctx.fillText("Ghost your best time.", 64, 530);
    }
  });
}

/** Pasted broadsheet poster with a real cited line. */
function drawPoster(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  claim: Claim | null,
  dark: boolean,
): void {
  const paper = dark ? "#141412" : "#e9e7e0";
  const ink = dark ? "#f5f5f7" : "#11100e";
  const muted = dark ? "#a7a5a0" : "#41403a";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  // aged paper noise
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = dark ? "rgba(245,245,247,0.03)" : "rgba(17,16,14,0.04)";
    ctx.fillRect(pseudo(i) * w, pseudo(i + 99) * h, 3 + pseudo(i + 7) * 5, 2);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.fillStyle = ink;
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText("STABLEDASH", 44, 78);
  ctx.fillStyle = dark ? "#d0ea66" : "#11100e";
  ctx.fillText("LIVE", 258, 78);
  ctx.fillStyle = muted;
  ctx.font = `500 22px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(claim?.date ?? "TUE & THU · 12PM ET", w - 44, 78);
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.fillRect(44, 96, w - 88, 3);
  const quote = claim?.quote ?? "The block is open. Every line on these walls is cited to a guest and an episode.";
  ctx.font = `400 58px ${SERIF}`;
  const lines = wrap(ctx, `“${quote}”`, w - 88, 7);
  lines.forEach((line, i) => ctx.fillText(line, 44, 180 + i * 66));
  const by = claim ? [claim.guest, claim.company].filter(Boolean).join(", ") : "Modern Money District";
  ctx.fillStyle = ink;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText(by.toUpperCase(), 44, h - 96);
  ctx.fillStyle = muted;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText(
    claim ? (claim.verified ? `${claim.episode} · on-air tape` : `${claim.episode} · positioning, confirm on air`) : "Walk in. Play a door.",
    44,
    h - 60,
  );
}

function tickerItems(claims: Claim[]): string[] {
  if (!claims.length) {
    return [
      "STABLEDASH LIVE · TUESDAYS AND THURSDAYS · 12PM ET",
      "FOUR DOORS · ONE BLOCK · PLAY THE BEAT, EARN THE LINE",
    ];
  }
  return claims.slice(0, 14).map((c) => {
    const who = [c.guest, c.company].filter(Boolean).join(" · ").toUpperCase();
    const q = c.quote.length > 110 ? `${c.quote.slice(0, 108).trim()}…` : c.quote;
    return `${who}  “${q}”`;
  });
}

function drawTicker(ctx: CanvasRenderingContext2D, w: number, h: number, items: string[]): void {
  ctx.fillStyle = "#0f0f0d";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(245,245,247,0.12)";
  ctx.fillRect(0, 0, w, 3);
  ctx.fillRect(0, h - 3, w, 3);
  ctx.textBaseline = "middle";
  let x = 40;
  const cats = ["MARKETS", "RAILS", "POLICY", "AGENTS", "CAPITAL"];
  let i = 0;
  while (x < w + 400) {
    const item = items[i % items.length];
    ctx.fillStyle = "#d0ea66";
    ctx.font = `500 34px ${SANS}`;
    const cat = cats[i % cats.length];
    ctx.fillText(cat, x, h / 2);
    x += ctx.measureText(cat).width + 26;
    ctx.fillStyle = "#f5f5f7";
    ctx.font = `400 40px ${SANS}`;
    ctx.fillText(item, x, h / 2);
    x += ctx.measureText(item).width + 60;
    ctx.fillStyle = "#8b8b9e";
    ctx.fillRect(x - 30, h / 2 - 3, 6, 6);
    i += 1;
    if (i > 200) break;
  }
  ctx.textBaseline = "alphabetic";
}

function skylineTexture(): THREE.CanvasTexture {
  return canvasTexture(4096, 1024, (ctx, w, h) => {
    // night sky with a city horizon glow baked in
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#11100e");
    g.addColorStop(0.42, "#1a1a1d");
    g.addColorStop(0.72, "#27272c");
    g.addColorStop(1, "#33333b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    let x = 0;
    let k = 0;
    while (x < w) {
      const bw = 90 + pseudo(k) * 220;
      const bh = 180 + pseudo(k + 3) * 620;
      const top = h - bh;
      ctx.fillStyle = "#15151a";
      ctx.fillRect(x, top, bw, bh);
      // setbacks / water tower / antenna
      if (pseudo(k + 9) > 0.6) {
        ctx.fillRect(x + bw * 0.3, top - 60, bw * 0.4, 60);
      }
      if (pseudo(k + 11) > 0.72) {
        ctx.fillRect(x + bw * 0.5 - 3, top - 140, 6, 140);
      }
      if (pseudo(k + 13) > 0.7) {
        ctx.fillRect(x + bw * 0.62, top - 42, 34, 42);
        ctx.fillRect(x + bw * 0.62 + 14, top - 58, 6, 16);
      }
      // windows
      const cols = Math.max(2, Math.floor(bw / 26));
      const rows = Math.floor(bh / 30);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = pseudo(k * 131 + r * 17 + c * 7);
          if (n > 0.58) {
            ctx.fillStyle = `rgba(245,245,247,${0.14 + n * 0.5})`;
            ctx.fillRect(x + 8 + c * 26, top + 14 + r * 30, 10, 14);
          }
        }
      }
      x += bw + 6 + pseudo(k + 5) * 30;
      k += 1;
    }
  });
}

function sponsorTexture(name: (typeof SPONSORS)[number]): THREE.CanvasTexture {
  return canvasTexture(1024, 384, (ctx, w, h) => {
    ctx.fillStyle = "#1b1b18";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(245,245,247,0.22)";
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = "#d0ea66";
    ctx.fillRect(12, 12, 10, h - 24);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText("LIVE NIGHT PARTNER", 64, 84);
    ctx.fillStyle = "#f5f5f7";
    ctx.font = `500 132px ${SANS}`;
    ctx.fillText(name, 60, 228);
    ctx.fillStyle = "#a7a5a0";
    ctx.font = `italic 44px ${SERIF}`;
    ctx.fillText(SPONSOR_LINES[name], 64, 312);
  });
}

function subwaySign(): THREE.CanvasTexture {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#0f0f0d";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f5f5f7";
    ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = "#d0ea66";
    ctx.beginPath();
    ctx.arc(120, h / 2 + 4, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#11100e";
    ctx.font = `500 100px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText("R", 120, h / 2 + 40);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f5f5f7";
    ctx.font = `500 84px ${SANS}`;
    ctx.fillText("Rails Station", 240, 128);
    ctx.fillStyle = "#a7a5a0";
    ctx.font = `400 40px ${SANS}`;
    ctx.fillText("ACH · Cards · USDC   →  Downtown & T+0", 240, 196);
  });
}

function plaqueTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1b1b18";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(245,245,247,0.3)";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#f5f5f7";
    ctx.font = `400 84px ${SERIF}`;
    ctx.fillText("Modern Money District", 48, 120);
    ctx.fillStyle = "#a7a5a0";
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText("A STABLEDASH LIVE NIGHT  ·  FOUR DOORS  ·  ONE BLOCK", 48, 190);
  });
}

function staticTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 96, (ctx, w, h) => drawStatic(ctx, w, h));
}
function drawStatic(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 40 + Math.random() * 190;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v + 6;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

/* ---------- scene helpers ---------- */

function addBox(
  group: THREE.Group,
  colliders: THREE.Box3[] | null,
  geo: THREE.BoxGeometry,
  mat: THREE.Material | THREE.Material[],
  x: number,
  y: number,
  z: number,
  shadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  group.add(mesh);
  if (colliders) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.expandByScalar(-0.24);
    if (box.max.x > box.min.x && box.max.z > box.min.z) colliders.push(box);
  }
  return mesh;
}

function plane(
  group: THREE.Group,
  w: number,
  h: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rotY: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  group.add(mesh);
  return mesh;
}

function lamp(group: THREE.Group, x: number, z: number): THREE.PointLight {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.7 }),
  );
  pole.position.set(x, 2.1, z);
  group.add(pole);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.9),
    new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.7 }),
  );
  arm.position.set(x, 4.15, z + (z > 0 ? -0.4 : 0.4));
  group.add(arm);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.1, 0.34),
    new THREE.MeshStandardMaterial({
      color: palette.ivory,
      emissive: palette.ivory,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
  );
  head.position.set(x, 4.15, z + (z > 0 ? -0.8 : 0.8));
  group.add(head);
  const light = new THREE.PointLight(0xf5f5f7, 9, 13, 1.9);
  light.position.set(x, 4.0, z + (z > 0 ? -0.8 : 0.8));
  group.add(light);
  return light;
}

function globeLamp(group: THREE.Group, x: number, z: number): void {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.7 }),
  );
  post.position.set(x, 1.1, z);
  group.add(post);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 12),
    new THREE.MeshStandardMaterial({
      color: palette.lime,
      emissive: palette.lime,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    }),
  );
  globe.position.set(x, 2.4, z);
  group.add(globe);
  const light = new THREE.PointLight(0xd0ea66, 1.6, 4.5, 2);
  light.position.set(x, 2.4, z);
  group.add(light);
}

/* ---------- build ---------- */

export function buildDistrict(opts: { video: HTMLVideoElement }): District {
  const group = new THREE.Group();
  const colliders: THREE.Box3[] = [];
  const doors: Door[] = [];
  const posters: Array<{ tex: THREE.CanvasTexture; dark: boolean }> = [];
  const marqueeBulbs: Array<{ meshes: THREE.Mesh[]; phase: number }> = [];
  const statics: THREE.CanvasTexture[] = [];
  const practicals: THREE.PointLight[] = [];

  const bulbOn = new THREE.MeshStandardMaterial({
    color: palette.ivory,
    emissive: palette.ivory,
    emissiveIntensity: 1.1,
    roughness: 0.3,
  });
  const bulbOff = new THREE.MeshStandardMaterial({
    color: palette.neutral700,
    emissive: palette.ivory,
    emissiveIntensity: 0.08,
    roughness: 0.5,
  });
  const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);

  /* ground */
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 34),
    new THREE.MeshStandardMaterial({
      color: palette.asphalt,
      roughness: 0.42,
      metalness: 0.12,
    }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  group.add(asphalt);

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: palette.sidewalk,
    roughness: 0.85,
  });
  const curbMat = new THREE.MeshStandardMaterial({ color: palette.neutral700, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(34, 0.12, 3.4), sidewalkMat);
    walk.position.set(0, 0.06, s * 5.0);
    walk.receiveShadow = true;
    group.add(walk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(34, 0.13, 0.12), curbMat);
    curb.position.set(0, 0.065, s * 3.3);
    group.add(curb);
    // sidewalk seams
    for (let i = -8; i <= 8; i++) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.005, 3.4),
        new THREE.MeshStandardMaterial({ color: palette.neutral700, roughness: 0.9 }),
      );
      seam.position.set(i * 2, 0.125, s * 5.0);
      group.add(seam);
    }
  }
  const lineMat = new THREE.MeshStandardMaterial({ color: palette.gray, roughness: 0.8 });
  for (let i = -8; i <= 8; i++) {
    if (Math.abs(i) < 2) continue;
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.09), lineMat);
    dash.position.set(i * 1.9, 0.02, 0);
    group.add(dash);
  }
  for (let i = -4; i <= 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 6.4), lineMat);
    stripe.position.set(i * 0.6, 0.02, 0);
    group.add(stripe);
  }
  // manholes + a grate
  for (const [mx, mz] of [[-7, -1.2], [8, 1.4]] as const) {
    const cover = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.55, metalness: 0.3 }),
    );
    cover.position.set(mx, 0.02, mz);
    group.add(cover);
  }

  /* plaque */
  const plaque = addBox(
    group,
    colliders,
    new THREE.BoxGeometry(3.0, 0.7, 0.5),
    new THREE.MeshStandardMaterial({ color: palette.charcoal, roughness: 0.5 }),
    0,
    0.4,
    0,
  );
  const plaqueTex = plaqueTexture();
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    roughness: 0.5,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: plaqueTex,
    emissiveIntensity: 0.35,
  });
  plane(group, 2.8, 0.5, plaqueMat, 0, 0.48, 0.26, 0);
  plane(group, 2.8, 0.5, plaqueMat, 0, 0.48, -0.26, Math.PI);
  void plaque;

  /* skyline + fog wall */
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 30, 64, 1, true),
    new THREE.MeshBasicMaterial({
      map: skylineTexture(),
      side: THREE.BackSide,
      fog: false,
    }),
  );
  sky.position.set(0, 14.6, 0);
  group.add(sky);
  // a few nearer towers for parallax
  const towerTex = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 6; c++) {
        const n = pseudo(r * 13 + c * 7);
        if (n > 0.55) {
          ctx.fillStyle = `rgba(245,245,247,${0.1 + n * 0.45})`;
          ctx.fillRect(16 + c * 40, 14 + r * 25, 18, 12);
        }
      }
    }
  });
  towerTex.wrapS = THREE.RepeatWrapping;
  towerTex.wrapT = THREE.RepeatWrapping;
  const towerMat = new THREE.MeshStandardMaterial({
    map: towerTex,
    roughness: 0.95,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: towerTex,
    emissiveIntensity: 0.55,
  });
  for (const [tx, tz, tw, th] of [
    [-20, -20, 6, 22],
    [19, -22, 8, 26],
    [22, 18, 7, 20],
    [-22, 19, 5, 18],
    [-9, -26, 7, 19],
    [9, 26, 8, 23],
    [12, -27, 5, 15],
    [-11, 27, 6, 16],
  ] as const) {
    const geo = new THREE.BoxGeometry(tw, th, tw);
    const t = new THREE.Mesh(geo, towerMat);
    t.position.set(tx, th / 2, tz);
    group.add(t);
  }

  /* shared media */
  const video = opts.video;
  const videoTex = new THREE.VideoTexture(video);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  videoTex.minFilter = THREE.LinearFilter;
  const screenMat = new THREE.MeshBasicMaterial({ map: videoTex, color: 0xcfcfd4 });
  const staticTex = staticTexture();
  statics.push(staticTex);
  const staticMat = new THREE.MeshBasicMaterial({ map: staticTex, color: 0x9a9aa2 });

  /* ticker */
  const tickerTex = canvasTexture(4096, 128, (ctx, w, h) => drawTicker(ctx, w, h, tickerItems([])));
  tickerTex.wrapS = THREE.RepeatWrapping;
  tickerTex.repeat.set(1.0, 1);
  const tickerMat = new THREE.MeshBasicMaterial({ map: tickerTex, color: 0xf0f0f0 });
  const tickerBack = new THREE.MeshStandardMaterial({ color: 0x0f0f0d, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const zFace = s * (ROW_Z - FACE);
    const back = new THREE.Mesh(new THREE.BoxGeometry(30.4, 0.62, 0.16), tickerBack);
    back.position.set(0, 3.95, zFace - s * 0.02);
    group.add(back);
    const strip = plane(group, 30, 0.5, tickerMat, 0, 3.95, zFace - s * 0.11, s > 0 ? Math.PI : 0);
    strip.userData.ticker = true;
  }

  /* materials shared by buildings */
  const massMat = new THREE.MeshStandardMaterial({ color: palette.charcoal, roughness: 0.86 });
  const trimMat = new THREE.MeshStandardMaterial({ color: palette.neutral700, roughness: 0.7 });
  const cornice = new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.8 });
  const facades = [facadeTexture(1, 4), facadeTexture(2, 4), facadeTexture(3, 2), facadeTexture(4, 2)];

  function upperFacade(x: number, z: number, w: number, facing: 1 | -1, tex: THREE.CanvasTexture): void {
    const zFace = z + facing * (FACE + 0.02);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      emissive: new THREE.Color(0xf5f5f7),
      emissiveMap: tex,
      emissiveIntensity: 0.8,
    });
    plane(group, w - 0.3, 4.2, mat, x, 6.55, zFace, facing > 0 ? 0 : Math.PI);
    // cornice
    addBox(group, null, new THREE.BoxGeometry(w + 0.3, 0.3, BUILDING_D + 0.3), cornice, x, BUILDING_H + 0.1, z, false);
    // parapet lip
    addBox(group, null, new THREE.BoxGeometry(w + 0.1, 0.2, 0.3), trimMat, x, BUILDING_H + 0.3, z + facing * FACE, false);
  }

  function storefront(def: (typeof STOREFRONTS)[number], facadeTex: THREE.CanvasTexture): void {
    const { x, z, facing, id, subtitle } = def;
    addBox(group, colliders, new THREE.BoxGeometry(BUILDING_W, BUILDING_H, BUILDING_D), massMat, x, BUILDING_H / 2, z);
    upperFacade(x, z, BUILDING_W, facing, facadeTex);
    const zFace = z + facing * (FACE + 0.03);
    const rot = facing > 0 ? 0 : Math.PI;

    // ground floor: dark stone base + window board + door
    addBox(group, null, new THREE.BoxGeometry(BUILDING_W + 0.2, 0.32, BUILDING_D + 0.2), trimMat, x, 0.16, z, false);
    const boardMat = new THREE.MeshStandardMaterial({
      map: windowBoard(id),
      roughness: 0.3,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: windowBoard(id),
      emissiveIntensity: 0.55,
    });
    const boardX = x + (id === "stablecoin-shop" || id === "policy-desk" ? 2.5 : -2.5);
    plane(group, 3.6, 2.25, boardMat, boardX, 2.0, zFace, rot);
    // window frame
    const frameMat = new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.6 });
    addBox(group, null, new THREE.BoxGeometry(3.9, 0.08, 0.14), frameMat, boardX, 3.18, zFace, false);
    addBox(group, null, new THREE.BoxGeometry(3.9, 0.08, 0.14), frameMat, boardX, 0.84, zFace, false);

    // the other window: TV monitors in the Arcade / a poster pair elsewhere
    const otherX = x - (boardX - x);
    if (id === "agent-pay-arcade") {
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const mx = otherX - 0.85 + c * 1.7;
          const my = 1.35 + r * 1.2;
          addBox(group, null, new THREE.BoxGeometry(1.6, 1.1, 0.35), frameMat, mx, my, zFace - facing * 0.15, false);
          plane(group, 1.42, 0.9, r === 1 && c === 0 ? staticMat : screenMat, mx, my, zFace + facing * 0.04, rot);
        }
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const dark = (i + (facing > 0 ? 0 : 1)) % 2 === 0;
        const tex = canvasTexture(512, 704, (ctx, w, h) => drawPoster(ctx, w, h, null, dark));
        posters.push({ tex, dark });
        const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
        const p = plane(group, 1.3, 1.78, pm, otherX - 0.75 + i * 1.5, 1.95, zFace + facing * 0.01, rot);
        p.rotation.z = (pseudo(x + i * 3) - 0.5) * 0.06;
      }
    }

    // door + frame + transom
    const doorW = 1.7;
    const doorH = 2.5;
    const doorZ = z + facing * (FACE + 0.08);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x11100e,
        emissive: palette.ivory,
        emissiveIntensity: 0.06,
        roughness: 0.4,
      }),
    );
    door.position.set(x, doorH / 2, doorZ);
    door.userData.storefrontId = id;
    group.add(door);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + 0.24, doorH + 0.22, 0.06),
      new THREE.MeshStandardMaterial({ color: palette.gray, roughness: 0.5, metalness: 0.2 }),
    );
    frame.position.set(x, doorH / 2 + 0.05, doorZ - facing * 0.05);
    group.add(frame);
    // door glass mullions
    const mullion = new THREE.MeshStandardMaterial({ color: palette.gray, roughness: 0.5 });
    addBox(group, null, new THREE.BoxGeometry(0.05, doorH, 0.14), mullion, x, doorH / 2, doorZ, false);
    addBox(group, null, new THREE.BoxGeometry(doorW, 0.05, 0.14), mullion, x, 1.1, doorZ, false);

    // marquee over the door
    const marqZ = z + facing * (FACE + 0.75);
    const signIdle = new THREE.MeshStandardMaterial({
      map: marqueeTexture(id, subtitle, false),
      roughness: 0.5,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: marqueeTexture(id, subtitle, false),
      emissiveIntensity: 0.28,
    });
    const signHot = new THREE.MeshStandardMaterial({
      map: marqueeTexture(id, subtitle, true),
      roughness: 0.42,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: marqueeTexture(id, subtitle, true),
      emissiveIntensity: 0.62,
    });
    const marqueeBody = addBox(
      group,
      null,
      new THREE.BoxGeometry(5.8, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: palette.charcoal, roughness: 0.7 }),
      x,
      5.15,
      marqZ,
      false,
    );
    void marqueeBody;
    const sign = plane(group, 5.6, 1.4, signIdle, x, 5.15, marqZ + facing * 0.76, rot);
    sign.userData.storefrontId = id;
    // marquee side panels (same texture, sideways)
    plane(group, 1.3, 1.4, signIdle, x - 2.91, 5.15, marqZ, -Math.PI / 2);
    plane(group, 1.3, 1.4, signIdle, x + 2.91, 5.15, marqZ, Math.PI / 2);
    // bulbs around the marquee lip
    const bulbs: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const bx = x - 2.75 + (5.5 / 17) * i;
      const b = new THREE.Mesh(bulbGeo, bulbOff);
      b.position.set(bx, 5.98, marqZ + facing * 0.78);
      group.add(b);
      bulbs.push(b);
      const b2 = new THREE.Mesh(bulbGeo, bulbOff);
      b2.position.set(bx, 4.32, marqZ + facing * 0.78);
      group.add(b2);
      bulbs.push(b2);
    }
    marqueeBulbs.push({ meshes: bulbs, phase: pseudo(x * z) * 20 });
    // underside practical: one lime fixture per door
    const practical = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.05, 0.1),
      new THREE.MeshStandardMaterial({
        color: palette.lime,
        emissive: palette.lime,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      }),
    );
    practical.position.set(x, 4.38, marqZ + facing * 0.2);
    group.add(practical);
    const pl = new THREE.PointLight(0xd0ea66, 1.5, 5.2, 2);
    pl.position.set(x, 4.1, marqZ);
    group.add(pl);
    practicals.push(pl);

    // Rails Station reads as a subway entrance
    if (id === "rails-station") {
      const railMat = new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.5, metalness: 0.35 });
      for (const side of [-1, 1]) {
        const rx = x + side * 1.55;
        addBox(group, colliders, new THREE.BoxGeometry(0.08, 1.0, 2.6), railMat, rx, 0.5, doorZ + facing * 1.6);
        addBox(group, null, new THREE.BoxGeometry(0.08, 0.08, 2.6), railMat, rx, 1.02, doorZ + facing * 1.6, false);
        globeLamp(group, rx, doorZ + facing * 2.9);
      }
      const signMat = new THREE.MeshStandardMaterial({
        map: subwaySign(),
        roughness: 0.5,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: subwaySign(),
        emissiveIntensity: 0.35,
      });
      const sb = addBox(group, null, new THREE.BoxGeometry(3.3, 0.82, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f0f0d }), x, 2.95, doorZ + facing * 2.9, false);
      void sb;
      plane(group, 3.2, 0.78, signMat, x, 2.95, doorZ + facing * 2.96, rot);
      plane(group, 3.2, 0.78, signMat, x, 2.95, doorZ + facing * 2.84, rot + Math.PI);
    }

    doors.push({
      id,
      position: new THREE.Vector3(x, 1.65, doorZ + facing * 1.7),
      mesh: door,
      sign,
      signIdle,
      signHot,
      hit: [door, sign, frame],
    });
  }

  STOREFRONTS.forEach((def, i) => storefront(def, facades[i % 2]));

  /* infill: TV-bank building (north center), newsstand (south center), end buildings */
  function infill(x: number, z: number, w: number, h: number, facing: 1 | -1, tex: THREE.CanvasTexture): number {
    addBox(group, colliders, new THREE.BoxGeometry(w, h, BUILDING_D), massMat, x, h / 2, z);
    const zFace = z + facing * (FACE + 0.02);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      emissive: new THREE.Color(0xf5f5f7),
      emissiveMap: tex,
      emissiveIntensity: 0.7,
    });
    plane(group, w - 0.2, Math.min(4.2, h - 4.4), mat, x, h - 2.3, zFace, facing > 0 ? 0 : Math.PI);
    addBox(group, null, new THREE.BoxGeometry(w + 0.25, 0.28, BUILDING_D + 0.25), cornice, x, h + 0.08, z, false);
    return zFace;
  }

  // North center: broadcast window, a 3x3 bank of monitors playing the Live pre-roll
  {
    const zFace = infill(0, -ROW_Z, 3.0, 7.4, 1, facades[2]);
    const frameMat = new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.6 });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const mx = -0.95 + c * 0.95;
        const my = 0.85 + r * 0.82;
        addBox(group, null, new THREE.BoxGeometry(0.9, 0.76, 0.5), frameMat, mx, my, zFace - 0.2, false);
        const isStatic = (r === 0 && c === 2) || (r === 2 && c === 0);
        plane(group, 0.8, 0.6, isStatic ? staticMat : screenMat, mx, my, zFace + 0.06, 0);
      }
    }
    const tag = canvasTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = "#0f0f0d";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#f5f5f7";
      ctx.font = `500 46px ${SANS}`;
      ctx.fillText("ON AIR", 30, 82);
      ctx.fillStyle = "#d0ea66";
      ctx.beginPath();
      ctx.arc(230, 64, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a7a5a0";
      ctx.font = `400 30px ${SANS}`;
      ctx.fillText("TU · TH 12PM ET", 270, 78);
    });
    plane(group, 2.6, 0.65, new THREE.MeshBasicMaterial({ map: tag }), 0, 3.5, zFace + 0.03, 0);
    const glow = new THREE.PointLight(0xdfe3f0, 1.4, 5, 2);
    glow.position.set(0, 2, zFace + 1.2);
    group.add(glow);
  }

  // South center: newsstand with pasted broadsheets
  {
    const zFace = infill(0, ROW_Z, 3.0, 6.6, -1, facades[3]);
    // kiosk
    const kioskMat = new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.75 });
    addBox(group, colliders, new THREE.BoxGeometry(2.6, 2.3, 1.4), kioskMat, 0, 1.15, zFace - 1.2);
    addBox(group, null, new THREE.BoxGeometry(3.0, 0.08, 1.9), trimMat, 0, 2.42, zFace - 1.25, false);
    const kioskFront = zFace - 1.2 - 0.71;
    for (let i = 0; i < 3; i++) {
      const tex = canvasTexture(512, 704, (ctx, w, h) => drawPoster(ctx, w, h, null, i === 1));
      posters.push({ tex, dark: i === 1 });
      const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const p = plane(group, 0.72, 0.98, pm, -0.85 + i * 0.85, 1.35, kioskFront - 0.01, Math.PI);
      p.rotation.z = (pseudo(i * 11) - 0.5) * 0.08;
    }
    const news = canvasTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = "#e9e7e0";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#11100e";
      ctx.font = `500 62px ${SANS}`;
      ctx.fillText("NEWSSTAND", 34, 86);
      ctx.fillStyle = "#41403a";
      ctx.font = `italic 34px ${SERIF}`;
      ctx.fillText("open late", 400, 84);
    });
    plane(group, 2.6, 0.62, new THREE.MeshStandardMaterial({ map: news, roughness: 0.8 }), 0, 2.15, kioskFront - 0.02, Math.PI);
    // wall posters behind the kiosk
    for (let i = 0; i < 2; i++) {
      const tex = canvasTexture(512, 704, (ctx, w, h) => drawPoster(ctx, w, h, null, i === 0));
      posters.push({ tex, dark: i === 0 });
      const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const p = plane(group, 1.05, 1.44, pm, -0.72 + i * 1.44, 3.55, zFace - 0.01, Math.PI);
      p.rotation.z = (pseudo(i * 5 + 2) - 0.5) * 0.07;
    }
  }

  // End infill buildings with posters + sponsor lightboxes
  const ends: Array<[number, number, 1 | -1]> = [
    [-12.9, -ROW_Z, 1],
    [12.9, -ROW_Z, 1],
    [-12.9, ROW_Z, -1],
    [12.9, ROW_Z, -1],
  ];
  ends.forEach(([x, z, facing], i) => {
    const zFace = infill(x, z, 3.9, 7.0 + (i % 2) * 0.9, facing, facades[(i + 1) % 4]);
    const rot = facing > 0 ? 0 : Math.PI;
    const tex = canvasTexture(512, 704, (ctx, w, h) => drawPoster(ctx, w, h, null, i % 2 === 0));
    posters.push({ tex, dark: i % 2 === 0 });
    const p = plane(group, 1.25, 1.72, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), x - 0.9, 1.9, zFace + facing * 0.01, rot);
    p.rotation.z = (pseudo(i * 17 + 4) - 0.5) * 0.08;
    const s = SPONSORS[(i * 2) % SPONSORS.length];
    const sTex = sponsorTexture(s);
    const sm = new THREE.MeshStandardMaterial({
      map: sTex,
      roughness: 0.45,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: sTex,
      emissiveIntensity: 0.3,
    });
    plane(group, 1.9, 0.72, sm, x + 0.75, 2.3, zFace + facing * 0.02, rot);
    plane(group, 1.9, 0.72, sm, x + 0.75, 1.35, zFace + facing * 0.02, rot).material = new THREE.MeshStandardMaterial({
      map: sponsorTexture(SPONSORS[(i * 2 + 1) % SPONSORS.length]),
      roughness: 0.45,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: sponsorTexture(SPONSORS[(i * 2 + 1) % SPONSORS.length]),
      emissiveIntensity: 0.3,
    });
  });

  /* end walls + big sponsor boards on them */
  const endMat = new THREE.MeshStandardMaterial({ color: 0x141412, roughness: 0.9 });
  addBox(group, colliders, new THREE.BoxGeometry(2.4, 10, 26), endMat, -17.2, 5, 0);
  addBox(group, colliders, new THREE.BoxGeometry(2.4, 10, 26), endMat, 17.2, 5, 0);
  SPONSORS.slice(0, 6).forEach((s, i) => {
    const side = i < 3 ? -1 : 1;
    const zz = -6.4 + (i % 3) * 6.4;
    const tex = sponsorTexture(s);
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: tex,
      emissiveIntensity: 0.32,
    });
    plane(group, 4.6, 1.72, m, side * 15.95, 4.6 + (i % 2) * 1.2, zz, side < 0 ? Math.PI / 2 : -Math.PI / 2);
  });

  /* street furniture */
  lamp(group, -10.6, -3.7);
  lamp(group, 10.6, -3.7);
  lamp(group, -10.6, 3.7);
  lamp(group, 10.6, 3.7);
  lamp(group, -2.6, 3.7);
  lamp(group, 2.6, -3.7);

  const hydrant = new THREE.MeshStandardMaterial({ color: palette.gray, roughness: 0.6, metalness: 0.2 });
  for (const [hx, hz] of [[-4.4, -3.9], [5.2, 3.9]] as const) {
    addBox(group, null, new THREE.BoxGeometry(0.26, 0.7, 0.26), hydrant, hx, 0.47, hz, false);
    addBox(group, null, new THREE.BoxGeometry(0.5, 0.14, 0.14), hydrant, hx, 0.62, hz, false);
  }
  // newspaper boxes
  for (let i = 0; i < 3; i++) {
    const bx = -8.6 + i * 0.8;
    const box = addBox(group, null, new THREE.BoxGeometry(0.62, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: i === 1 ? palette.neutral800 : palette.charcoal, roughness: 0.7 }), bx, 0.67, 4.1, false);
    void box;
    const tex = canvasTexture(256, 352, (ctx, w, h) => drawPoster(ctx, w, h, null, i !== 1));
    posters.push({ tex, dark: i !== 1 });
    plane(group, 0.5, 0.68, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), bx, 0.8, 3.84, Math.PI);
  }
  // payphone
  const phoneMat = new THREE.MeshStandardMaterial({ color: palette.neutral800, roughness: 0.55, metalness: 0.3 });
  addBox(group, colliders, new THREE.BoxGeometry(0.8, 2.3, 0.8), phoneMat, 9.2, 1.15, -4.2);
  plane(
    group,
    0.7,
    0.3,
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 96, (ctx, w, h) => {
        ctx.fillStyle = "#f5f5f7";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#11100e";
        ctx.font = `500 54px ${SANS}`;
        ctx.fillText("PHONE", 22, 68);
      }),
    }),
    9.2,
    2.05,
    -3.79,
    0,
  );
  // planters
  const planterMat = new THREE.MeshStandardMaterial({ color: palette.charcoal, roughness: 0.8 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x23241f, roughness: 1 });
  for (const [x, z] of [[-12.4, -4.5], [12.4, -4.5], [-12.4, 4.5], [12.4, 4.5]] as const) {
    addBox(group, colliders, new THREE.BoxGeometry(1.2, 0.4, 1.2), planterMat, x, 0.2, z);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.05), hedgeMat);
    hedge.position.set(x, 0.68, z);
    group.add(hedge);
  }
  // parked town car silhouette at the far curb
  const carMat = new THREE.MeshStandardMaterial({ color: 0x141412, roughness: 0.35, metalness: 0.45 });
  addBox(group, colliders, new THREE.BoxGeometry(4.6, 0.7, 1.9), carMat, -13.2, 0.55, 2.2);
  addBox(group, null, new THREE.BoxGeometry(2.6, 0.55, 1.7), carMat, -13.4, 1.15, 2.2, false);
  for (const wx of [-14.6, -11.8]) {
    for (const wz of [1.3, 3.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), new THREE.MeshStandardMaterial({ color: 0x0c0c0b, roughness: 0.9 }));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.34, wz);
      group.add(wheel);
    }
  }

  /* lights: ivory key, cool charcoal fill, low ambient */
  const hemi = new THREE.HemisphereLight(0xe9e9ee, 0x11100e, 0.32);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xf3efe6, 0.9);
  key.position.set(6, 16, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  key.shadow.bias = -0.0005;
  group.add(key);
  const fill = new THREE.DirectionalLight(0x8b8b9e, 0.16);
  fill.position.set(-10, 6, -6);
  group.add(fill);
  group.add(new THREE.AmbientLight(0x2a2a26, 0.5));

  let staticT = 0;
  let bulbT = 0;
  let bulbStep = 0;

  function update(dt: number, t: number): void {
    tickerTex.offset.x = (tickerTex.offset.x + dt * 0.022) % 1;
    staticT += dt;
    if (staticT > 0.08) {
      staticT = 0;
      const c = (staticTex.image as HTMLCanvasElement).getContext("2d");
      if (c) drawStatic(c, 128, 96);
      staticTex.needsUpdate = true;
    }
    bulbT += dt;
    if (bulbT > 0.12) {
      bulbT = 0;
      bulbStep += 1;
      for (const m of marqueeBulbs) {
        m.meshes.forEach((b, i) => {
          b.material = (i + bulbStep + Math.floor(m.phase)) % 3 === 0 ? bulbOn : bulbOff;
        });
      }
    }
    practicals.forEach((p, i) => {
      p.intensity = 1.45 + Math.sin(t * 7 + i * 1.7) * 0.06 + (pseudo(Math.floor(t * 9) + i) > 0.985 ? -0.5 : 0);
    });
  }

  function setClaims(claims: Claim[]): void {
    const tape = claims.filter((c) => c.verified);
    const rest = claims.filter((c) => !c.verified);
    const ordered = [...tape, ...rest];
    if (!ordered.length) return;
    posters.forEach((p, i) => {
      const claim = ordered[i % ordered.length];
      redraw(p.tex, (ctx, w, h) => drawPoster(ctx, w, h, claim, p.dark));
    });
    redraw(tickerTex, (ctx, w, h) => drawTicker(ctx, w, h, tickerItems(ordered)));
  }

  return {
    group,
    colliders,
    doors,
    spawn: new THREE.Vector3(0, 1.7, 3.4),
    spawnYaw: 0,
    update,
    setClaims,
  };
}

export function nearestDoor(doors: Door[], pos: THREE.Vector3, radius = 4.6): Door | null {
  let best: Door | null = null;
  let bestD = radius;
  for (const door of doors) {
    const d = Math.hypot(door.position.x - pos.x, door.position.z - pos.z);
    if (d < bestD) {
      best = door;
      bestD = d;
    }
  }
  return best;
}

export { HEADLINES };
