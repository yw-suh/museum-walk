/**
 * 바닥 높이 계산.
 *
 * 전시실 대부분은 평평하지만, 다뤼 계단이나 피라미드 입구 단처럼
 * 높이가 달라지는 곳이 있다. rooms.json 의 `ground` 배열이 그 규칙이고,
 * 여기서 (x, z) → y 를 돌려주는 함수를 만든다.
 *
 *   platform : 사각형 영역이 통째로 y 높이
 *   ramp     : 사각형 영역에서 axis 방향을 따라 y0 → y1 로 기울어짐
 *
 * 영역이 겹치면 가장 높은 값을 쓴다 — 계단 위 층계참이 자연스럽게 이긴다.
 */
export function createGroundSampler(room) {
  const parts = room.ground ?? [];
  if (!parts.length) return () => 0;

  return function heightAt(x, z) {
    let y = 0;
    for (const part of parts) {
      const [minX, minZ] = part.min;
      const [maxX, maxZ] = part.max;
      if (x < minX || x > maxX || z < minZ || z > maxZ) continue;

      if (part.type === 'platform') {
        y = Math.max(y, part.y);
        continue;
      }
      if (part.type === 'ramp') {
        const t =
          part.axis === 'x'
            ? (x - minX) / Math.max(1e-6, maxX - minX)
            : (z - minZ) / Math.max(1e-6, maxZ - minZ);
        y = Math.max(y, part.y0 + (part.y1 - part.y0) * Math.min(1, Math.max(0, t)));
      }
    }
    return y;
  };
}
