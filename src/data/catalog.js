/**
 * 전시 데이터 접근 계층.
 *
 * 3D 씬·UI 코드는 JSON 파일을 직접 읽지 않고 이 모듈만 거칩니다.
 * 다음 단계에서 전시실이 여러 개가 되거나 데이터가 서버/DB 로 옮겨가더라도
 * 이 파일의 함수 시그니처만 유지하면 씬·조작 코드는 그대로 둘 수 있습니다.
 */
import roomsData from './rooms.json';
import paintingsData from './paintings.json';

/** 에셋 경로를 배포 base 기준 URL 로 바꾼다 ("images/a.webp" → "/images/a.webp") */
export function assetUrl(path) {
  return import.meta.env.BASE_URL + path;
}

/** @returns {{id: string, nameKo: string, nameFr: string, subtitle: string}[]} 로비에 쓸 전시실 목록 */
export function listRooms() {
  return roomsData.rooms.map(({ id, nameKo, nameFr, subtitle }) => ({
    id,
    nameKo,
    nameFr,
    subtitle,
  }));
}

/** 기본 전시실 id (전시실이 하나뿐인 현재는 이것이 곧 진입점) */
export function defaultRoomId() {
  return roomsData.rooms[0].id;
}

/** @returns {object} 전시실 전체 정의 (치수·벽·집기·조명·규칙) */
export function getRoom(roomId) {
  const room = roomsData.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error(`전시실을 찾을 수 없습니다: ${roomId}`);
  return room;
}

/**
 * 전시실에 걸린 작품 목록. 걸이 높이와 감상 위치 거리는
 * rooms.json 의 규칙으로 여기서 미리 계산해 넘긴다 — 씬 코드는 숫자만 쓰면 된다.
 */
export function getPaintings(roomId) {
  const room = getRoom(roomId);
  return paintingsData.paintings
    .filter((p) => p.room === roomId)
    .map((painting) => ({
      ...painting,
      image: assetUrl(painting.image),
      imageLarge: painting.imageLarge ? assetUrl(painting.imageLarge) : null,
      placement: {
        ...painting.placement,
        centerHeight: hangHeight(painting, room.hangingRule),
        viewFrom: viewingDistance(painting, room.viewingSpot),
      },
    }));
}

/**
 * 걸이 높이(m). 세로 150cm 초과 대형 작품은 하단을 바닥에서 0.8m 에 맞추고,
 * 그 외에는 중심을 1.6m(눈높이 근처)에 맞춘다.
 */
export function hangHeight(painting, rule) {
  if (typeof painting.placement.centerHeight === 'number') return painting.placement.centerHeight;
  const heightM = painting.size.heightCm / 100;
  return painting.size.heightCm > rule.largeThresholdCm
    ? rule.largeBottom + heightM / 2
    : rule.defaultCenter;
}

/** 작품 앞 감상 위치까지의 거리(m). 큰 작품일수록 멀리 선다. */
export function viewingDistance(painting, spot) {
  if (typeof painting.placement.viewFrom === 'number') return painting.placement.viewFrom;
  const heightM = painting.size.heightCm / 100;
  return Math.min(spot.max, Math.max(spot.min, heightM * spot.factor));
}
