import * as THREE from 'three';

/**
 * 렌더러 · 씬 · 카메라를 만든다.
 *
 * 전역 조명은 방마다 다르므로 여기서 붙이지 않는다 — main.js 의
 * applyRoomLighting() 이 공간을 바꿀 때마다 갈아 끼운다.
 *
 * 작품 캔버스는 MeshBasicMaterial 로 그리므로(= 조명 영향을 받지 않음)
 * 조명은 벽·바닥·액자·아바타의 분위기만 담당한다.
 */
export function createScene({ canvas, room }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // 그림자는 쓰지 않는다. 그림자 맵이 없으면 스포트 조명을 여러 개 켜도
  // 추가 렌더 패스가 생기지 않아 일반 노트북에서도 프레임이 안정적이다.
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(room.materials.wainscot);
  scene.fog = new THREE.Fog(room.materials.wainscot, 26, 90);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 240);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  return { renderer, scene, camera, perfGuard: createPerfGuard(renderer, resize) };
}

/**
 * 60fps 유지용 안전장치: 고해상도 디스플레이에서 프레임이 계속 16.7ms 를 넘기면
 * 픽셀 비율을 한 단계씩 낮춘다. 한 번 내려간 뒤에는 다시 올리지 않는다(널뛰기 방지).
 */
function createPerfGuard(renderer, resize) {
  const steps = [2, 1.5, 1];
  let index = steps.findIndex((s) => s <= renderer.getPixelRatio());
  if (index < 0) index = steps.length - 1;

  let frames = 0;
  let elapsed = 0;

  return function tick(dt) {
    if (index >= steps.length - 1) return; // 더 내릴 곳이 없다
    frames++;
    elapsed += dt;
    if (elapsed < 2) return; // 2초마다 판단

    const fps = frames / elapsed;
    frames = 0;
    elapsed = 0;
    if (fps >= 55) return;

    index++;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, steps[index]));
    resize();
    console.info(`[perf] ${fps.toFixed(0)}fps — 픽셀 비율을 ${steps[index]} 로 낮춥니다.`);
  };
}
