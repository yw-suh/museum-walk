/**
 * URL 질의 문자열로 현재 공간과 디버그 옵션을 주고받는다.
 *
 *   ?room=salle-des-etats   특정 전시실로 바로 입장
 *   ?bots=3                 가짜 방문자 3명 (Phase 3 네트워크 자리 테스트용)
 *   ?debug                  FPS·드로우콜 표시
 */
import { hasRoom } from '../data/catalog.js';

export function readRoute() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  const bots = Number.parseInt(params.get('bots') ?? '0', 10);
  return {
    roomId: room && hasRoom(room) ? room : null,
    bots: Number.isFinite(bots) ? Math.min(12, Math.max(0, bots)) : 0,
    debug: params.has('debug'),
  };
}

/** 주소창의 room 만 바꾼다 (bots·debug 등 나머지 파라미터는 유지) */
export function writeRoom(roomId, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.history[replace ? 'replaceState' : 'pushState']({ roomId }, '', url);
}

/** 뒤로/앞으로 가기 대응 */
export function onRouteChange(handler) {
  window.addEventListener('popstate', () => handler(readRoute()));
}
