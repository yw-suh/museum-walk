import * as THREE from 'three';
import { Avatar } from './Avatar.js';

const EYE_HEIGHT = 1.62; // 1인칭 눈높이 (m)
const RADIUS = 0.35; // 충돌용 몸통 반지름 (m)
const WALK_SPEED = 3.0; // m/s
const RUN_SPEED = 5.6;
const DAMPING = 12;
const PITCH_LIMIT = Math.PI / 2 - 0.08;

// 3인칭 카메라: 시선 축 위에서 뒤로 물러나 따라간다.
// 카메라를 아바타 쪽으로 돌리지 않고 **시선 방향 그대로** 두기 때문에,
// 화면 한가운데 조준점이 1인칭과 똑같이 "바라보는 곳"을 가리킨다.
const THIRD = { pivot: 1.5, back: 4.0, up: 0.38, minBack: 0.9, pad: 0.3 };

/**
 * 이동 · 충돌 · 1인칭/3인칭 카메라 · 내 아바타를 함께 관리한다.
 *
 * 입력은 InputSource 에서, 공간 정보는 바깥에서 setRoom() 으로 받는다.
 * 결과는 PlayerState 에 그대로 반영되므로 Phase 3 에서 그 객체만 보내면 된다.
 */
export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('../core/input.js').InputSource} input
   * @param {import('../core/PlayerState.js').PlayerState} state
   */
  constructor(camera, input, state) {
    this.camera = camera;
    this.input = input;
    this.state = state;

    this.yaw = 0;
    this.pitch = 0;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.facing = 0; // 아바타가 바라보는 방향 (이동 방향을 따라 부드럽게 돈다)
    this.viewMode = 'third'; // 'first' | 'third'
    this.colliders = [];
    this.expanded = [];
    this.ground = () => 0; // (x, z) → 바닥 높이. 계단이 있는 공간에서 교체된다.
    this.locked = false;
    this.frozen = false; // 패널·뷰어가 열려 있을 때 이동을 멈춘다

    this.avatar = new Avatar({ name: state.name, color: state.color });

    this._raycaster = new THREE.Raycaster();
    this._listeners = { lock: new Set(), unlock: new Set() };

    this._onPointerLockChange = () => {
      const locked = document.pointerLockElement === this._lockTarget;
      if (locked === this.locked) return;
      this.locked = locked;
      this.input.enabled = locked;
      for (const fn of this._listeners[locked ? 'lock' : 'unlock']) fn();
    };
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  /** 포인터 잠금을 걸 요소 (데스크톱 전용) */
  setLockTarget(element) {
    this._lockTarget = element;
  }

  lock() {
    this._lockTarget?.requestPointerLock?.();
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  addEventListener(type, fn) {
    this._listeners[type]?.add(fn);
  }

  /** 터치 기기에서는 포인터 잠금 없이 바로 조작할 수 있게 한다 */
  enableWithoutLock() {
    this.locked = true;
    this.input.enabled = true;
    for (const fn of this._listeners.lock) fn();
  }

  disableWithoutLock() {
    this.locked = false;
    this.input.enabled = false;
    for (const fn of this._listeners.unlock) fn();
  }

  /** 공간이 바뀔 때 충돌 박스·바닥 높이·시작 위치를 교체 */
  setRoom(room, colliders, ground, spawn = room.spawn) {
    this.state.roomId = room.id;
    this.colliders = colliders;
    this.ground = ground ?? (() => 0);
    this.expanded = colliders.map((box) =>
      box.clone().expandByVector(new THREE.Vector3(RADIUS, 0, RADIUS)),
    );
    this.teleport(spawn.position, spawn.yaw ?? 0);
  }

  teleport(position, yaw = this.yaw) {
    this.position.set(position[0], this.ground(position[0], position[2]), position[2]);
    this.yaw = yaw;
    this.pitch = 0;
    this.facing = yaw;
    this.velocity.set(0, 0, 0);
    this._writeState(false);
    this._placeCamera();
  }

  toggleView() {
    this.viewMode = this.viewMode === 'first' ? 'third' : 'first';
    return this.viewMode;
  }

  /** 작품을 정면에서 보도록 카메라와 몸을 옮긴다 */
  faceArtwork(worldPosition, normal, distance) {
    const target = new THREE.Vector3(worldPosition.x, 0, worldPosition.z).addScaledVector(normal, distance);
    if (!this._blocked(target.x, target.z)) {
      this.position.set(target.x, this.ground(target.x, target.z), target.z);
    }
    // 카메라 기본 시선은 -Z 이므로, 작품 쪽(-normal)을 보려면 yaw = atan2(normal.x, normal.z)
    this.yaw = Math.atan2(normal.x, normal.z);
    this.facing = this.yaw;
    this.velocity.set(0, 0, 0);
    this._writeState(false);

    // 조준점(= 카메라 중앙 광선)이 작품 중심을 향하도록 pitch 를 맞춘다.
    // 3인칭에서는 카메라 위치가 pitch 에 따라 달라지므로 두 번 반복해 수렴시킨다.
    for (let i = 0; i < 2; i++) {
      this._placeCamera();
      const horizontal = Math.hypot(worldPosition.x - this.camera.position.x, worldPosition.z - this.camera.position.z);
      this.pitch = THREE.MathUtils.clamp(
        Math.atan2(worldPosition.y - this.camera.position.y, Math.max(0.3, horizontal)),
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
    }
    this._placeCamera();
  }

  update(dt) {
    const look = this.input.readLook();
    if (this.locked && !this.frozen) {
      this.yaw += look.dx;
      this.pitch = THREE.MathUtils.clamp(this.pitch + look.dy, -PITCH_LIMIT, PITCH_LIMIT);
    }

    const move = this.locked && !this.frozen ? this.input.readMove() : { x: 0, y: 0 };
    const speed = this.input.isRunning() ? RUN_SPEED : WALK_SPEED;

    this.velocity.multiplyScalar(Math.max(0, 1 - DAMPING * dt));
    if (move.x || move.y) {
      const dir = new THREE.Vector3(move.x, 0, -move.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.velocity.addScaledVector(dir, speed * DAMPING * dt);
    }
    if (this.velocity.lengthSq() > speed * speed) this.velocity.setLength(speed);

    // 축을 나눠 이동 → 한쪽이 막혀도 다른 축으로는 미끄러진다
    const nextX = this.position.x + this.velocity.x * dt;
    if (!this._blocked(nextX, this.position.z)) this.position.x = nextX;
    else this.velocity.x = 0;

    const nextZ = this.position.z + this.velocity.z * dt;
    if (!this._blocked(this.position.x, nextZ)) this.position.z = nextZ;
    else this.velocity.z = 0;

    // 계단·단 위에서는 발밑 높이를 따라간다 (갑자기 튀지 않도록 부드럽게)
    const targetY = this.ground(this.position.x, this.position.z);
    this.position.y += (targetY - this.position.y) * Math.min(1, dt * 18);

    const moving = this.velocity.lengthSq() > 0.09;
    if (moving) {
      // 아바타는 실제 이동 방향을 보고, 그 방향으로 부드럽게 돈다
      const heading = Math.atan2(this.velocity.x, this.velocity.z);
      this.facing = approachAngle(this.facing, heading, dt * 12);
    } else if (this.viewMode === 'first') {
      this.facing = this.yaw;
    }

    this._writeState(moving);
    this.avatar.update(dt, this.state);
    this.avatar.setVisible(this.viewMode === 'third');
    this._placeCamera();
  }

  _writeState(moving) {
    this.state.position = [this.position.x, this.position.y, this.position.z];
    this.state.rotation = this.facing;
    this.state.moving = moving;
  }

  /** 현재 yaw·pitch 가 가리키는 단위 방향 */
  viewDirection(out = new THREE.Vector3()) {
    const cos = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cos, Math.sin(this.pitch), -Math.cos(this.yaw) * cos);
  }

  _placeCamera() {
    if (this.viewMode === 'first') {
      this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }

    const pivot = new THREE.Vector3(this.position.x, this.position.y + THIRD.pivot, this.position.z);
    const desired = pivot.clone().addScaledVector(this.viewDirection(), -THIRD.back);
    desired.y += THIRD.up;

    // 벽에 파묻히지 않도록, 몸에서 카메라 자리까지 선을 쏘아 막히면 앞으로 당긴다
    const toCamera = desired.clone().sub(pivot);
    const distance = toCamera.length();
    toCamera.normalize();
    let hit = distance;
    const point = new THREE.Vector3();
    this._raycaster.set(pivot, toCamera);
    this._raycaster.far = distance;
    for (const box of this.colliders) {
      if (this._raycaster.ray.intersectBox(box, point)) hit = Math.min(hit, pivot.distanceTo(point));
    }

    this.camera.position.copy(pivot).addScaledVector(toCamera, Math.max(THIRD.minBack, hit - THIRD.pad));
    this.camera.position.y = Math.max(0.5, this.camera.position.y);
    // 아바타를 쳐다보지 않고 시선 방향 그대로 — 조준점이 곧 바라보는 곳이다
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  /** (x, z) 지점이 어떤 충돌 박스 안에 들어가는지 */
  _blocked(x, z) {
    const foot = this.ground(x, z);
    for (const box of this.expanded) {
      // 발밑보다 25cm 넘게 솟아 있는 것만 막는다 (계단 위에 올라선 뒤에는 통과)
      if (x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z && box.max.y > foot + 0.25) {
        return true;
      }
    }
    return false;
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    this.avatar.dispose();
  }
}

/** 각도를 최단 경로로 target 쪽으로 t 만큼 돌린다 */
function approachAngle(current, target, t) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, t);
}

export { EYE_HEIGHT };
