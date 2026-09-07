import * as THREE from "three";
import { STOREFRONTS, SPONSORS, palette } from "../theme";
import type { StorefrontId } from "../types";

export interface Door {
  id: StorefrontId;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
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
    ctx.fillStyle = "#1a1c17";
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
        if (n < 3) ctx.fillStyle = "#151610";
        else if (n < 6) ctx.fillStyle = "#2a2c27";
        else if (n < 8) ctx.fillStyle = "rgba(245,245,247,0.16)";
        else ctx.fillStyle = "#3a3c36";
        const x = padX + c * (cellW + gapX);
        const y = padY + r * (cellH + gapY);
        ctx.fillRect(x, y, cellW, cellH);
      }
    }
  });
}

function signTexture(title: string, subtitle: string): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#11100e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#d0ea66";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = "#d0ea66";
    ctx.font = "400 68px 'Instrument Serif', serif";
    ctx.fillText(title, 48, 118);
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "500 34px 'DM Sans', sans-serif";
    ctx.fillText(subtitle, 48, 186);
  });
}

function plaqueTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#11100e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(245,245,247,0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "400 44px 'Instrument Serif', serif";
    ctx.fillText("Modern Money District", 48, 110);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = "500 26px 'DM Sans', sans-serif";
    ctx.fillText("STABLEDASH STREET  ·  FOUR DOORS", 48, 168);
  });
}

/** Charcoal/ivory fallback board when TextureLoader fails (esp. SVG). */
function sponsorFallbackTexture(name: string): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#11100e";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1a1c17";
    ctx.fillRect(24, 24, w - 48, h - 48);
    ctx.strokeStyle = "rgba(245,245,247,0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, w - 72, h - 72);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = "500 26px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LIVE SPONSOR", w / 2, 130);
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "400 78px 'Instrument Serif', serif";
    ctx.fillText(name.toUpperCase(), w / 2, 280);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = "400 22px 'DM Sans', sans-serif";
    ctx.fillText("STABLEDASH · MODERN MONEY DISTRICT", w / 2, 380);
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
      color: palette.ivory,
      emissive: palette.ivory,
      emissiveIntensity: 0.55,
      roughness: 0.45,
    }),
  );
  head.position.set(x, 3.62, z);
  group.add(head);

  const light = new THREE.PointLight(palette.ivory, 4.5, 12, 2);
  light.position.set(x, 3.5, z);
  group.add(light);
}

function applySponsorMap(
  mat: THREE.MeshStandardMaterial,
  tex: THREE.Texture,
): void {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  mat.map = tex;
  mat.emissiveMap = tex;
  mat.emissive = new THREE.Color(0xffffff);
  mat.emissiveIntensity = 0.55;
  mat.needsUpdate = true;
}

function mountBillboardFace(
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  rotY: number,
): THREE.Mesh {
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.1),
    new THREE.MeshStandardMaterial({
      color: palette.navy,
      roughness: 0.55,
      metalness: 0.15,
    }),
  );
  frame.position.set(x, y, z);
  frame.rotation.y = rotY;
  group.add(frame);

  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  // nudge slightly toward viewer so it sits proud of the frame
  const nx = Math.sin(rotY);
  const nz = Math.cos(rotY);
  face.position.set(x + nx * 0.06, y, z + nz * 0.06);
  face.rotation.y = rotY;
  group.add(face);
  return face;
}

/**
 * Times Square-style sponsor strip: street posts opposite storefronts
 * plus stacked boards on building faces / end walls.
 */
function addBillboardStrip(group: THREE.Group, colliders: THREE.Box3[]): void {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  type Slot = {
    name: string;
    logoUrl: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    w: number;
    h: number;
    post?: boolean;
  };

  const slots: Slot[] = [];

  // Street posts on sidewalks, facing the street (opposite storefronts)
  const postPairs: Array<[number, number, number]> = [
    [-9.2, -3.55, 0], // rotY 0 → faces +Z (south, toward street from north walk)
    [-3.0, -3.55, 0],
    [3.0, -3.55, 0],
    [9.2, -3.55, 0],
    [-9.2, 3.55, Math.PI],
    [-3.0, 3.55, Math.PI],
    [3.0, 3.55, Math.PI],
    [9.2, 3.55, Math.PI],
  ];

  SPONSORS.forEach((sp, i) => {
    if (i < postPairs.length) {
      const [x, z, rotY] = postPairs[i]!;
      slots.push({
        name: sp.name,
        logoUrl: sp.logoUrl,
        x,
        y: 3.35,
        z,
        rotY,
        w: 2.4,
        h: 1.35,
        post: true,
      });
    }
  });

  // Extra building-face / end-wall boards for remaining sponsors (and densify)
  const facadeSlots: Array<[number, number, number, number, number, number]> = [
    // west end wall facing east into the block
    [-14.9, 5.4, -4.2, Math.PI / 2, 3.2, 1.8],
    [-14.9, 5.4, 0, Math.PI / 2, 3.2, 1.8],
    [-14.9, 5.4, 4.2, Math.PI / 2, 3.2, 1.8],
    // east end wall facing west
    [14.9, 5.4, -4.2, -Math.PI / 2, 3.2, 1.8],
    [14.9, 5.4, 0, -Math.PI / 2, 3.2, 1.8],
    [14.9, 5.4, 4.2, -Math.PI / 2, 3.2, 1.8],
    // upper building faces between storefronts (north row, facing street)
    [-11.2, 6.5, -5.2, 0, 2.6, 1.5],
    [11.2, 6.5, -5.2, 0, 2.6, 1.5],
    // south row facing street
    [-11.2, 6.5, 5.2, Math.PI, 2.6, 1.5],
    [11.2, 6.5, 5.2, Math.PI, 2.6, 1.5],
  ];

  // Cycle all sponsors across facade slots so the strip feels dense
  facadeSlots.forEach((slot, i) => {
    const sp = SPONSORS[i % SPONSORS.length]!;
    const [x, y, z, rotY, w, h] = slot;
    slots.push({ name: sp.name, logoUrl: sp.logoUrl, x, y, z, rotY, w, h });
  });

  for (const slot of slots) {
    if (slot.post) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 2.7, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.7 }),
      );
      pole.position.set(slot.x, 1.35, slot.z);
      group.add(pole);
      // thin base pad — no collider so walk stays clear
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.08, 10),
        new THREE.MeshStandardMaterial({ color: palette.slate, roughness: 0.85 }),
      );
      pad.position.set(slot.x, 0.04, slot.z);
      group.add(pad);
    }

    const fallback = sponsorFallbackTexture(slot.name);
    const mat = new THREE.MeshStandardMaterial({
      map: fallback,
      roughness: 0.42,
      metalness: 0.05,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: fallback,
      emissiveIntensity: 0.45,
    });

    mountBillboardFace(
      group,
      mat,
      slot.w,
      slot.h,
      slot.x,
      slot.y,
      slot.z,
      slot.rotY,
    );

    // Prefer raster logos; SVG often fails in TextureLoader — keep fallback.
    const isSvg = /\.svg(\?|$)/i.test(slot.logoUrl);
    if (!isSvg) {
      loader.load(
        slot.logoUrl,
        (tex) => applySponsorMap(mat, tex),
        undefined,
        () => {
          /* keep canvas fallback */
        },
      );
    } else {
      // Still try SVG; many hosts serve it as image/* and browsers can decode.
      loader.load(
        slot.logoUrl,
        (tex) => applySponsorMap(mat, tex),
        undefined,
        () => {
          /* canvas fallback already on mat */
        },
      );
    }
  }

  void colliders;
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
    color: palette.charcoal,
    roughness: 0.82,
    metalness: 0.05,
  });
  const slate = new THREE.MeshStandardMaterial({
    color: palette.slate,
    roughness: 0.78,
  });
  const windows = new THREE.MeshStandardMaterial({
    map: facade,
    roughness: 0.55,
    metalness: 0.05,
    emissive: new THREE.Color(0xf5f5f7),
    emissiveIntensity: 0.08,
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
      color: 0x11100e,
      emissive: palette.ivory,
      emissiveIntensity: 0.04,
      roughness: 0.45,
    }),
  );
  door.position.set(x, doorH / 2, doorZ);
  door.userData.storefrontId = id;
  group.add(door);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.16, doorH + 0.16, 0.06),
    new THREE.MeshStandardMaterial({
      color: palette.secondary,
      emissive: palette.secondary,
      emissiveIntensity: 0.05,
      roughness: 0.55,
    }),
  );
  frame.position.set(x, doorH / 2, doorZ - facing * 0.05);
  group.add(frame);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 1.5),
    new THREE.MeshStandardMaterial({
      map: signTexture(name, subtitle),
      roughness: 0.45,
      emissive: palette.lime,
      emissiveIntensity: 0.18,
    }),
  );
  sign.position.set(x, 5.35, faceZ + facing * 0.02);
  sign.rotation.y = facing > 0 ? 0 : Math.PI;
  group.add(sign);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.08, 1.3),
    new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.7 }),
  );
  awning.position.set(x, 3.15, z + facing * (BUILDING_D / 2 + 0.55));
  group.add(awning);

  doors.push({
    id,
    position: new THREE.Vector3(x, 1.2, doorZ + facing * 0.9),
    mesh: door,
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
    color: 0x2a2c27,
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
    color: palette.ivory,
    emissive: palette.ivory,
    emissiveIntensity: 0.12,
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
    color: 0x22241f,
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

  // Times Square sponsor strip — midnight/charcoal boards, no purple fog
  addBillboardStrip(group, colliders);

  // Soft warm ambient only — brand terminal midnight/charcoal (no purple fog)
  const hemi = new THREE.HemisphereLight(0x2a2c27, 0x11100e, 0.22);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xf5f5f7, 0.95);
  key.position.set(8, 16, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  group.add(key);

  // Fill to keep billboards readable without purple wash
  const fill = new THREE.DirectionalLight(0xa7a5a0, 0.22);
  fill.position.set(-6, 10, -4);
  group.add(fill);

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
  radius = 2.4,
): Door | null {
  let best: Door | null = null;
  let bestD = radius;
  for (const door of doors) {
    const d = door.position.distanceTo(pos);
    if (d < bestD) {
      best = door;
      bestD = d;
    }
  }
  return best;
}
