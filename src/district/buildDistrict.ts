import * as THREE from "three";
import { STOREFRONTS, palette } from "../theme";
import type { StorefrontId } from "../types";

export interface Door {
  id: StorefrontId;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  hit: THREE.Object3D[];
}

export interface District {
  group: THREE.Group;
  colliders: THREE.Box3[];
  doors: Door[];
  spawn: THREE.Vector3;
  spawnYaw: number;
}

const BUILDING_W = 9.4;
const BUILDING_H = 7.2;
const BUILDING_D = 6.2;

function makeCanvasTexture(
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

function windowFacade(): THREE.CanvasTexture {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#101820";
    ctx.fillRect(0, 0, w, h);
    const cols = 6;
    const rows = 7;
    const padX = 28;
    const padY = 36;
    const gapX = 10;
    const gapY = 12;
    const cellW = (w - padX * 2 - gapX * (cols - 1)) / cols;
    const cellH = (h - padY * 2 - gapY * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = (r * 17 + c * 13) % 10;
        if (n < 3) ctx.fillStyle = "#2a2416";
        else if (n < 6) ctx.fillStyle = "#c9b48a";
        else if (n < 8) ctx.fillStyle = "#e8a317";
        else ctx.fillStyle = "#8a7a55";
        const x = padX + c * (cellW + gapX);
        const y = padY + r * (cellH + gapY);
        ctx.fillRect(x, y, cellW, cellH);
      }
    }
  });
}

function signTexture(title: string, subtitle: string): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#0b0b09";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e8a317";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = "#e8a317";
    ctx.font = "600 72px 'IBM Plex Mono', monospace";
    ctx.fillText(title, 48, 118);
    ctx.fillStyle = "#e8e0d0";
    ctx.font = "500 34px 'IBM Plex Mono', monospace";
    ctx.fillText(subtitle, 48, 186);
  });
}

function plaqueTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#0b0b09";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e8a317";
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = "#e8a317";
    ctx.font = "600 48px 'IBM Plex Mono', monospace";
    ctx.fillText("MODERN MONEY DISTRICT", 48, 110);
    ctx.fillStyle = "#e8e0d0";
    ctx.font = "400 28px 'IBM Plex Mono', monospace";
    ctx.fillText("STABLEDASH STREET  ·  FOUR DOORS", 48, 168);
  });
}

function addBox(
  group: THREE.Group,
  colliders: THREE.Box3[],
  geo: THREE.BoxGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  collide = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (collide) {
    mesh.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(mesh));
  }
  return mesh;
}

function lamp(group: THREE.Group, x: number, z: number): void {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.7 }),
  );
  pole.position.set(x, 1.8, z);
  group.add(pole);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.12, 0.45),
    new THREE.MeshStandardMaterial({
      color: palette.amber,
      emissive: palette.amber,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    }),
  );
  head.position.set(x, 3.62, z);
  group.add(head);

  const light = new THREE.PointLight(palette.amber, 8, 14, 2);
  light.position.set(x, 3.5, z);
  group.add(light);
}

function buildStorefront(
  group: THREE.Group,
  colliders: THREE.Box3[],
  doors: Door[],
  facade: THREE.CanvasTexture,
  def: (typeof STOREFRONTS)[number],
): void {
  const { x, z, facing, name, subtitle, id } = def;
  const navy = new THREE.MeshStandardMaterial({
    color: palette.navy,
    roughness: 0.82,
    metalness: 0.08,
  });
  const slate = new THREE.MeshStandardMaterial({
    color: palette.slate,
    roughness: 0.78,
  });
  const windows = new THREE.MeshStandardMaterial({
    map: facade,
    roughness: 0.55,
    metalness: 0.05,
    emissive: new THREE.Color(0x22180a),
    emissiveIntensity: 0.35,
  });

  addBox(
    group,
    colliders,
    new THREE.BoxGeometry(BUILDING_W, BUILDING_H, BUILDING_D),
    navy,
    x,
    BUILDING_H / 2,
    z,
  );

  const faceZ = z + facing * (BUILDING_D / 2 + 0.06);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(BUILDING_W - 0.5, BUILDING_H - 1.4),
    windows,
  );
  face.position.set(x, BUILDING_H / 2 + 0.15, faceZ);
  face.rotation.y = facing > 0 ? 0 : Math.PI;
  group.add(face);

  const plinth = addBox(
    group,
    colliders,
    new THREE.BoxGeometry(BUILDING_W + 0.3, 0.35, BUILDING_D + 0.3),
    slate,
    x,
    0.17,
    z,
    false,
  );
  void plinth;

  const doorW = 1.7;
  const doorH = 2.5;
  const doorZ = z + facing * (BUILDING_D / 2 + 0.08);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a08,
      emissive: palette.amber,
      emissiveIntensity: 0.18,
      roughness: 0.4,
    }),
  );
  door.position.set(x, doorH / 2, doorZ);
  door.userData.storefrontId = id;
  group.add(door);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.16, doorH + 0.16, 0.06),
    new THREE.MeshStandardMaterial({
      color: palette.amber,
      emissive: palette.amber,
      emissiveIntensity: 0.6,
    }),
  );
  frame.position.set(x, doorH / 2, doorZ - facing * 0.05);
  group.add(frame);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 1.5),
    new THREE.MeshStandardMaterial({
      map: signTexture(name, subtitle),
      roughness: 0.45,
      emissive: palette.amber,
      emissiveIntensity: 0.22,
    }),
  );
  sign.position.set(x, 5.35, faceZ + facing * 0.02);
  sign.rotation.y = facing > 0 ? 0 : Math.PI;
  sign.userData.storefrontId = id;
  group.add(sign);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.08, 1.3),
    new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.7 }),
  );
  awning.position.set(x, 3.15, z + facing * (BUILDING_D / 2 + 0.55));
  group.add(awning);

  doors.push({
    id,
    position: new THREE.Vector3(x, 1.65, doorZ + facing * 1.7),
    mesh: door,
    hit: [door, sign, frame],
  });
}

export function buildDistrict(): District {
  const group = new THREE.Group();
  const colliders: THREE.Box3[] = [];
  const doors: Door[] = [];
  const facade = windowFacade();

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 28),
    new THREE.MeshStandardMaterial({
      color: palette.asphalt,
      roughness: 0.95,
    }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  group.add(asphalt);

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: palette.sidewalk,
    roughness: 0.9,
  });
  const northWalk = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.08, 3.2),
    sidewalkMat,
  );
  northWalk.position.set(0, 0.04, -5.1);
  group.add(northWalk);
  const southWalk = northWalk.clone();
  southWalk.position.set(0, 0.04, 5.1);
  group.add(southWalk);

  const lineMat = new THREE.MeshStandardMaterial({
    color: palette.amber,
    emissive: palette.amber,
    emissiveIntensity: 0.35,
  });
  for (let i = -6; i <= 6; i++) {
    if (i === 0) continue;
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.08), lineMat);
    dash.position.set(i * 1.8, 0.03, 0);
    group.add(dash);
  }

  for (let i = -4; i <= 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.025, 5.6),
      new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.8 }),
    );
    stripe.position.set(i * 0.55, 0.03, 0);
    group.add(stripe);
  }

  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: palette.navy, roughness: 0.5 }),
  );
  plaque.position.set(0, 0.4, 0);
  group.add(plaque);
  const plaqueFace = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 0.55),
    new THREE.MeshStandardMaterial({ map: plaqueTexture() }),
  );
  plaqueFace.position.set(0, 0.55, 0.37);
  group.add(plaqueFace);
  const plaqueFaceB = plaqueFace.clone();
  plaqueFaceB.position.set(0, 0.55, -0.37);
  plaqueFaceB.rotation.y = Math.PI;
  group.add(plaqueFaceB);
  plaque.updateMatrixWorld(true);
  colliders.push(new THREE.Box3().setFromObject(plaque));

  for (const def of STOREFRONTS) {
    buildStorefront(group, colliders, doors, facade, def);
  }

  const endMat = new THREE.MeshStandardMaterial({
    color: 0x0e141c,
    roughness: 0.86,
  });
  addBox(group, colliders, new THREE.BoxGeometry(2.4, 8, 22), endMat, -16.2, 4, 0);
  addBox(group, colliders, new THREE.BoxGeometry(2.4, 8, 22), endMat, 16.2, 4, 0);

  lamp(group, -10.5, -3.6);
  lamp(group, 10.5, -3.6);
  lamp(group, -10.5, 3.6);
  lamp(group, 10.5, 3.6);

  const planterMat = new THREE.MeshStandardMaterial({
    color: 0x2a2418,
    roughness: 0.8,
  });
  const hedgeMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a32,
    roughness: 1,
  });
  for (const [x, z] of [
    [-11.5, -4.6],
    [11.5, -4.6],
    [-11.5, 4.6],
    [11.5, 4.6],
  ] as const) {
    addBox(group, colliders, new THREE.BoxGeometry(1.2, 0.4, 1.2), planterMat, x, 0.2, z);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.05), hedgeMat);
    hedge.position.set(x, 0.68, z);
    group.add(hedge);
  }

  const hemi = new THREE.HemisphereLight(0x3a3224, 0x080806, 0.7);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2a8, 1.05);
  key.position.set(8, 16, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  group.add(key);

  return {
    group,
    colliders,
    doors,
    spawn: new THREE.Vector3(0, 1.65, 2.4),
    spawnYaw: Math.PI,
  };
}

export function nearestDoor(
  doors: Door[],
  pos: THREE.Vector3,
  radius = 4.6,
): Door | null {
  let best: Door | null = null;
  let bestD = radius;
  for (const door of doors) {
    const dx = door.position.x - pos.x;
    const dz = door.position.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d < bestD) {
      best = door;
      bestD = d;
    }
  }
  return best;
}
