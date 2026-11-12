import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const EYE_HEIGHT = 1.65; // 관람자 눈높이 (m)
const RADIUS = 0.35; // 충돌용 몸통 반지름 (m)
const WALK_SPEED = 3.0; // m/s
const RUN_SPEED = 5.6;
const DAMPING = 12; // 감속 계수

/**
 * WASD + 마우스(PointerLock) 1인칭 이동과 AABB 벽 충돌 처리.
 * 충돌은 X축·Z축을 분리해 풀기 때문에 벽을 따라 자연스럽게 미끄러진다.
 */
export class PlayerControls {
  constructor(camera, domElement, { colliders, spawn }) {
    this.controls = new PointerLockControls(camera, domElement);
    this.camera = camera;
    this.colliders = colliders;
    this.velocity = new THREE.Vector3();
    this.keys = new Set();

    // 충돌 검사를 싸게 하려고 AABB 를 미리 반지름만큼 부풀려 둔다
    this.expanded = colliders.map((box) =>
      box.clone().expandByVector(new THREE.Vector3(RADIUS, 0, RADIUS)),
    );

    this.reset(spawn);

    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  reset(spawn) {
    this.camera.position.set(spawn.position[0], EYE_HEIGHT, spawn.position[2]);
    this.camera.rotation.set(0, spawn.yaw ?? 0, 0, 'YXZ');
    this.velocity.set(0, 0, 0);
  }

  get isLocked() {
    return this.controls.isLocked;
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }

  addEventListener(type, fn) {
    this.controls.addEventListener(type, fn);
  }

  update(dt) {
    const k = this.keys;
    const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;

    // 관성 + 감속
    this.velocity.multiplyScalar(Math.max(0, 1 - DAMPING * dt));
    if (this.isLocked && (forward || strafe)) {
      const dir = new THREE.Vector3(strafe, 0, -forward).normalize();
      dir.applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ'));
      this.velocity.addScaledVector(dir, speed * DAMPING * dt);
    }
    if (this.velocity.lengthSq() > speed * speed) this.velocity.setLength(speed);

    // 축을 나눠 이동 → 한쪽이 막혀도 다른 축으로는 미끄러진다
    const pos = this.camera.position;
    const nextX = pos.x + this.velocity.x * dt;
    if (!this._blocked(nextX, pos.z)) pos.x = nextX;
    else this.velocity.x = 0;

    const nextZ = pos.z + this.velocity.z * dt;
    if (!this._blocked(pos.x, nextZ)) pos.z = nextZ;
    else this.velocity.z = 0;

    pos.y = EYE_HEIGHT;
  }

  /** (x, z) 지점이 어떤 충돌 박스 안에 들어가는지 */
  _blocked(x, z) {
    for (const box of this.expanded) {
      if (x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z) {
        // 몸통 높이(0 ~ 눈높이) 범위와 겹칠 때만 막는다 — 낮은 벤치는 넘지 못하게 유지
        if (box.max.y > 0.25) return true;
      }
    }
    return false;
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.controls.dispose();
  }
}
