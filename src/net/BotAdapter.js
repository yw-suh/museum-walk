import { NetworkAdapter } from './NetworkAdapter.js';
import { AVATAR_COLORS } from '../core/PlayerState.js';
import { getRoom, getPaintings } from '../data/catalog.js';

/**
 * ?bots=3 으로 켜는 테스트용 가짜 방문자.
 *
 * 진짜 서버 대신 브라우저 안에서 스냅샷을 만들어 onPlayersUpdate 로 흘려보낸다.
 * **실제 네트워크 어댑터와 완전히 같은 인터페이스**라서, Phase 3 에서
 * 이것을 실시간 구현으로 바꾸기만 하면 화면 코드는 그대로 동작한다.
 */
const NAMES = ['지우', '민서', 'Camille', '하준', 'Léa', '서연', 'Noah', '도윤', 'Alice', '유나', 'Hugo', '예린'];
const TICK = 1 / 12; // 초당 12번 — 실제 서버의 전송 주기를 흉내 낸다
const SPEED = 1.5;

export class BotAdapter extends NetworkAdapter {
  /** @param {number} count 생성할 가짜 방문자 수 */
  constructor(count) {
    super();
    this.count = count;
    this.bots = [];
    this.accumulator = 0;
    this.timer = null;
  }

  async connect(player) {
    this.player = player;
    this.spawn(player.roomId);
    this.last = performance.now();
    this.timer = setInterval(() => this._tick(), TICK * 1000);
  }

  /** 방이 바뀌면 가짜 방문자도 그 방으로 옮긴다 */
  spawn(roomId) {
    const room = getRoom(roomId);
    const spots = viewingSpots(roomId, room);
    this.bots = Array.from({ length: this.count }, (_, i) => {
      const start = spots[i % spots.length];
      return {
        id: `bot_${i + 1}`,
        name: NAMES[i % NAMES.length],
        color: AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length].hex,
        roomId,
        position: [start.x, 0, start.z],
        rotation: Math.random() * Math.PI * 2,
        moving: false,
        waypoints: spots,
        index: i % spots.length,
        wait: 1 + (i % 4),
      };
    });
  }

  _tick() {
    const now = performance.now();
    const dt = Math.min(0.5, (now - this.last) / 1000);
    this.last = now;

    for (const bot of this.bots) {
      const target = bot.waypoints[bot.index];
      const dx = target.x - bot.position[0];
      const dz = target.z - bot.position[2];
      const distance = Math.hypot(dx, dz);

      if (distance < 0.35) {
        // 작품 앞에 서서 잠시 감상한 뒤 다음 자리로
        bot.moving = false;
        bot.wait -= dt;
        if (bot.wait <= 0) {
          bot.index = (bot.index + 1) % bot.waypoints.length;
          bot.wait = 2 + Math.random() * 4;
        }
        bot.rotation = approach(bot.rotation, target.facing, dt * 3);
        continue;
      }

      bot.moving = true;
      const step = Math.min(distance, SPEED * dt);
      bot.position[0] += (dx / distance) * step;
      bot.position[2] += (dz / distance) * step;
      bot.rotation = approach(bot.rotation, Math.atan2(dx, dz), dt * 6);
    }

    this._emit(this.bots.map(toSnapshot));
  }

  disconnect() {
    clearInterval(this.timer);
    this.timer = null;
    this.bots = [];
    super.disconnect();
  }

  get statusLabel() {
    return `가짜 방문자 ${this.count}명 (테스트)`;
  }
}

/** 작품 앞 감상 위치를 돌아다닐 경로로 쓴다 — 실제 관람객처럼 보인다 */
function viewingSpots(roomId, room) {
  const walls = new Map(room.walls.map((w) => [w.id, w]));
  const spots = [];

  for (const painting of getPaintings(roomId)) {
    const wall = walls.get(painting.placement.wall);
    if (!wall) continue;
    const sign = painting.placement.face === '-' ? -1 : 1;
    const [cx, cz] = wall.center;
    const half = wall.thickness / 2;
    const distance = painting.placement.viewFrom;

    if (wall.axis === 'x') {
      spots.push({
        x: cx + painting.placement.offset,
        z: cz + sign * (half + distance),
        facing: sign > 0 ? Math.PI : 0,
      });
    } else {
      spots.push({
        x: cx + sign * (half + distance),
        z: cz + painting.placement.offset,
        facing: sign > 0 ? -Math.PI / 2 : Math.PI / 2,
      });
    }
  }

  if (spots.length) return spots;
  // 로비처럼 작품이 없는 공간은 중앙 주변을 크게 돈다
  const r = Math.min(room.dimensions.width, room.dimensions.depth) * 0.3;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, facing: angle };
  });
}

function toSnapshot(bot) {
  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    id: bot.id,
    name: bot.name,
    color: bot.color,
    roomId: bot.roomId,
    position: bot.position.map(r2),
    rotation: r2(bot.rotation),
    moving: bot.moving,
  };
}

function approach(current, target, t) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, t);
}
