/**
 * 플레이어 한 명의 상태. 내 아바타와 원격 아바타가 **같은 모양**의 객체를 쓴다.
 *
 * Phase 3 에서 이 객체가 그대로 네트워크를 타고 오간다.
 * 숫자는 전송량을 줄이려고 소수점 둘째 자리까지만 보낸다.
 *
 * @typedef {object} PlayerSnapshot
 * @property {string} id        플레이어 고유 id
 * @property {string} name      닉네임
 * @property {string} color     아바타 색 (#rrggbb)
 * @property {string} roomId    지금 있는 공간
 * @property {[number,number,number]} position 발밑 좌표
 * @property {number} rotation  바라보는 방향(yaw, 라디안)
 * @property {boolean} moving   걷는 중인지 (걷기 애니메이션 on/off)
 */

export const AVATAR_COLORS = [
  { id: 'rose', hex: '#e2725b', label: '테라코타' },
  { id: 'gold', hex: '#d2a24c', label: '골드' },
  { id: 'sage', hex: '#6f9a74', label: '세이지' },
  { id: 'azure', hex: '#4f82c4', label: '애저' },
  { id: 'plum', hex: '#8e6bab', label: '플럼' },
  { id: 'slate', hex: '#5d6b7a', label: '슬레이트' },
];

export class PlayerState {
  /**
   * @param {{id?: string, name?: string, color?: string, roomId?: string}} init
   */
  constructor({ id, name = '관람객', color = AVATAR_COLORS[0].hex, roomId } = {}) {
    this.id = id ?? `p_${Math.random().toString(36).slice(2, 10)}`;
    this.name = name;
    this.color = color;
    this.roomId = roomId;
    this.position = [0, 0, 0];
    this.rotation = 0;
    this.moving = false;
  }

  /** 네트워크로 보낼 평범한 객체 (@see PlayerSnapshot) */
  toSnapshot() {
    const r2 = (n) => Math.round(n * 100) / 100;
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      roomId: this.roomId,
      position: this.position.map(r2),
      rotation: r2(this.rotation),
      moving: this.moving,
    };
  }

  /** 받은 스냅샷을 그대로 반영 */
  applySnapshot(snapshot) {
    Object.assign(this, snapshot);
    return this;
  }

  static fromSnapshot(snapshot) {
    return new PlayerState({}).applySnapshot(snapshot);
  }
}
