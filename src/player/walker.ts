import * as THREE from "three";

const SPEED = 6.2;
const LOOK = 0.0022;
const PLAYER_R = 0.3;
const BOUNDS = 14.6;

export class Walker {
  readonly camera: THREE.PerspectiveCamera;
  readonly position = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  locked = false;
  private readonly keys = new Set<string>();
  stick = { x: 0, z: 0 };
  private readonly lookTarget = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();
  private readonly next = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  reset(origin: THREE.Vector3, yaw: number): void {
    this.position.copy(origin);
    this.yaw = yaw;
    this.pitch = 0;
    this.syncCamera();
  }

  bind(target: HTMLElement): () => void {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(k)
      ) {
        e.preventDefault();
        if (down) this.keys.add(k);
        else this.keys.delete(k);
      }
    };
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);

    const move = (e: MouseEvent) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * LOOK;
      this.pitch -= e.movementY * LOOK;
      this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch));
    };

    const lockChange = () => {
      this.locked = document.pointerLockElement === target;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("mousemove", move);
    document.addEventListener("pointerlockchange", lockChange);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("pointerlockchange", lockChange);
    };
  }

  lookDelta(dx: number, dy: number): void {
    this.yaw -= dx * LOOK * 1.15;
    this.pitch -= dy * LOOK * 1.15;
    this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch));
  }

  requestLock(el: HTMLElement): void {
    if (matchMedia("(pointer: coarse)").matches) return;
    void el.requestPointerLock();
  }

  exitLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  update(dt: number, colliders: THREE.Box3[]): void {
    let x = this.stick.x;
    let z = this.stick.z;
    if (this.keys.has("w") || this.keys.has("arrowup")) z -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) z += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;

    this.wish.set(x, 0, z);
    if (this.wish.lengthSq() > 1) this.wish.normalize();

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const fx = -sin * this.wish.z + cos * this.wish.x;
    const fz = -cos * this.wish.z - sin * this.wish.x;

    this.next.copy(this.position);
    this.next.x += fx * SPEED * dt;
    if (!blocked(this.next, colliders)) this.position.x = this.next.x;
    this.next.copy(this.position);
    this.next.z += fz * SPEED * dt;
    if (!blocked(this.next, colliders)) this.position.z = this.next.z;

    this.position.x = THREE.MathUtils.clamp(this.position.x, -BOUNDS, BOUNDS);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -10.8, 10.8);
    this.syncCamera();
  }

  private syncCamera(): void {
    this.camera.position.copy(this.position);
    this.lookTarget.set(
      this.position.x - Math.sin(this.yaw) * Math.cos(this.pitch),
      this.position.y + Math.sin(this.pitch),
      this.position.z - Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.camera.lookAt(this.lookTarget);
  }
}

function blocked(pos: THREE.Vector3, colliders: THREE.Box3[]): boolean {
  const minX = pos.x - PLAYER_R;
  const maxX = pos.x + PLAYER_R;
  const minZ = pos.z - PLAYER_R;
  const maxZ = pos.z + PLAYER_R;
  const minY = 0.2;
  const maxY = 1.8;
  for (const box of colliders) {
    if (
      minX < box.max.x &&
      maxX > box.min.x &&
      minY < box.max.y &&
      maxY > box.min.y &&
      minZ < box.max.z &&
      maxZ > box.min.z
    ) {
      return true;
    }
  }
  return false;
}
