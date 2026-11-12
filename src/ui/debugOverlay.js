/**
 * ?debug 로 켜는 성능 표시 — FPS · 드로우콜 · 삼각형 · 현재 위치.
 * 실제 기기에서 60fps 가 나오는지 확인하는 용도다.
 */
export function createDebugOverlay(renderer) {
  const root = document.querySelector('#debug');
  root.classList.remove('hidden');

  let frames = 0;
  let elapsed = 0;
  let fps = 0;
  let worstFrameMs = 0; // 세션 중 가장 오래 걸린 프레임
  let lowestFps = Infinity; // 0.5초 구간 평균 중 가장 낮았던 값
  let warmup = 1.5; // 첫 로딩 직후 튀는 프레임은 통계에서 뺀다

  return function tick(dt, info) {
    frames++;
    elapsed += dt;
    if (warmup > 0) {
      warmup -= dt;
    } else {
      worstFrameMs = Math.max(worstFrameMs, dt * 1000);
    }
    if (elapsed >= 0.5) {
      fps = frames / elapsed;
      if (warmup <= 0) lowestFps = Math.min(lowestFps, fps);
      frames = 0;
      elapsed = 0;
    }

    const r = renderer.info.render;
    root.textContent =
      `FPS ${fps.toFixed(0)} (최저 ${Number.isFinite(lowestFps) ? lowestFps.toFixed(0) : '-'})\n` +
      `프레임 최대 ${worstFrameMs.toFixed(1)}ms\n` +
      `드로우콜 ${r.calls} · 삼각형 ${r.triangles}\n` +
      `픽셀비 ${renderer.getPixelRatio().toFixed(2)} · 텍스처 ${renderer.info.memory.textures} · 지오메트리 ${renderer.info.memory.geometries}\n` +
      `방 ${info.roomId} · 시점 ${info.viewMode === 'first' ? '1인칭' : '3인칭'} · 아바타 ${info.avatars}\n` +
      `위치 x${info.position[0].toFixed(1)} z${info.position[2].toFixed(1)}`;
  };
}
