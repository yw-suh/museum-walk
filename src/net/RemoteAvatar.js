import { Avatar } from '../scene/Avatar.js';
import { PlayerState } from '../core/PlayerState.js';

/**
 * 다른 사람의 아바타.
 *
 * **내 아바타와 똑같은 Avatar 클래스를 쓴다.** 차이는 상태가 어디서 오느냐뿐이다:
 * 내 것은 PlayerController 가, 이쪽은 네트워크 스냅샷이 채운다.
 *
 * 스냅샷은 띄엄띄엄(초당 10~20회) 오므로, 그대로 그리면 뚝뚝 끊긴다.
 * 받은 값을 목표로 두고 매 프레임 부드럽게 따라가게 한다.
 */
const LERP = 10; // 위치 보간 속도
const TURN = 8; // 회전 보간 속도

export class RemoteAvatar {
  /** @param {object} snapshot */
  constructor(snapshot) {
    this.id = snapshot.id;
    this.state = PlayerState.fromSnapshot(snapshot);
    this.target = { position: [...snapshot.position], rotation: snapshot.rotation, moving: false };
    this.avatar = new Avatar({ name: snapshot.name, color: snapshot.color });
  }

  get object3D() {
    return this.avatar.object3D;
  }

  /** 새 스냅샷 수신 */
  applySnapshot(snapshot) {
    this.state.name = snapshot.name;
    this.state.color = snapshot.color;
    this.state.roomId = snapshot.roomId;
    this.target.position = snapshot.position;
    this.target.rotation = snapshot.rotation;
    this.target.moving = snapshot.moving;
    this.avatar.setName(snapshot.name);
    this.avatar.setColor(snapshot.color);
  }

  update(dt) {
    const k = Math.min(1, dt * LERP);
    for (let i = 0; i < 3; i++) {
      this.state.position[i] += (this.target.position[i] - this.state.position[i]) * k;
    }
    this.state.rotation = approach(this.state.rotation, this.target.rotation, dt * TURN);
    this.state.moving = this.target.moving;
    this.avatar.update(dt, this.state);
  }

  dispose() {
    this.avatar.dispose();
  }
}

function approach(current, target, t) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, t);
}

/**
 * 원격 아바타 묶음 관리 — 들어오고 나가는 사람을 알아서 붙이고 뗀다.
 * 현재 방에 있는 사람만 씬에 올린다.
 */
export class RemoteAvatarGroup {
  constructor(scene) {
    this.scene = scene;
    this.avatars = new Map();
  }

  /** @param {object[]} players 내 플레이어를 제외한 스냅샷 배열 */
  sync(players, currentRoomId) {
    const seen = new Set();

    for (const snapshot of players) {
      if (snapshot.roomId !== currentRoomId) continue;
      seen.add(snapshot.id);
      let remote = this.avatars.get(snapshot.id);
      if (!remote) {
        remote = new RemoteAvatar(snapshot);
        this.avatars.set(snapshot.id, remote);
        this.scene.add(remote.object3D);
      } else {
        remote.applySnapshot(snapshot);
      }
    }

    for (const [id, remote] of this.avatars) {
      if (seen.has(id)) continue;
      remote.dispose();
      this.avatars.delete(id);
    }
  }

  update(dt) {
    for (const remote of this.avatars.values()) remote.update(dt);
  }

  get count() {
    return this.avatars.size;
  }

  clear() {
    for (const remote of this.avatars.values()) remote.dispose();
    this.avatars.clear();
  }
}
