/**
 * 전시 데이터 접근 계층.
 *
 * 3D 씬·UI 코드는 JSON 파일을 직접 읽지 않고 이 모듈만 거칩니다.
 * 데이터가 서버/DB 로 옮겨가더라도 아래 함수 시그니처만 유지하면
 * 씬·조작 코드는 그대로 둘 수 있습니다.
 */
import roomsData from './rooms.json';
import paintingsData from './paintings.json';
import sculpturesData from './sculptures.json';

const DEFAULTS = roomsData.defaults;

/** 에셋 경로를 배포 base 기준 URL 로 바꾼다 ("images/a.webp" → "/images/a.webp") */
export function assetUrl(path) {
  return import.meta.env.BASE_URL + path;
}

/** 공간 목록 (메뉴와 로비 포털에 쓴다) */
export function listRooms() {
  return roomsData.rooms.map((r) => ({
    id: r.id,
    kind: r.kind,
    nameKo: r.nameKo,
    nameFr: r.nameFr,
    subtitle: r.subtitle,
    menuLabel: r.menuLabel,
    paintingCount: paintingsData.paintings.filter((p) => p.room === r.id).length,
    sculptureCount: sculpturesData.sculptures.filter((s) => s.room === r.id).length,
  }));
}

/** 전시 중인 모든 회화·조각 (소개·출처 화면이 쓴다) */
export function listAllWorks() {
  return {
    paintings: paintingsData.paintings,
    sculptures: sculpturesData.sculptures,
  };
}

/** 첫 진입 공간 */
export function defaultRoomId() {
  return roomsData.rooms[0].id;
}

export function hasRoom(roomId) {
  return roomsData.rooms.some((r) => r.id === roomId);
}

/**
 * 공간 전체 정의. defaults 의 조명·규칙을 방 설정으로 덮어쓴 결과를 돌려준다.
 */
export function getRoom(roomId) {
  const room = roomsData.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error(`공간을 찾을 수 없습니다: ${roomId}`);
  return {
    ...room,
    hangingRule: room.hangingRule ?? DEFAULTS.hangingRule,
    viewingSpot: room.viewingSpot ?? DEFAULTS.viewingSpot,
    lighting: { ...DEFAULTS.lighting, ...(room.lighting ?? {}) },
    portals: (room.portals ?? []).map((portal) => ({
      ...portal,
      targetName: roomsData.rooms.find((r) => r.id === portal.target)?.nameKo ?? portal.target,
    })),
  };
}

/**
 * 전시실에 걸린 작품 목록.
 * 걸이 높이와 감상 위치 거리는 rooms.json 의 규칙으로 여기서 미리 계산해 넘긴다 —
 * 씬 코드는 숫자만 쓰면 된다.
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

/** 공간에 놓인 조각 목록. 모델 경로를 배포 base 기준으로 바꿔 넘긴다. */
export function getSculptures(roomId) {
  return sculpturesData.sculptures
    .filter((s) => s.room === roomId)
    .map((sculpture) => ({ ...sculpture, model: assetUrl(sculpture.model) }));
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
