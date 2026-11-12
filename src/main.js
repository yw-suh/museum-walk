import * as THREE from 'three';
import './style.css';

import { getRoom, getPaintings, defaultRoomId } from './data/catalog.js';
import { createScene } from './scene/createScene.js';
import { buildRoom } from './scene/buildRoom.js';
import { buildPaintings } from './scene/buildPaintings.js';
import { PlayerControls } from './scene/PlayerControls.js';
import { PaintingPicker } from './interaction/picker.js';
import { createStartOverlay } from './ui/startOverlay.js';
import { createInfoPanel } from './ui/infoPanel.js';
import { createImageViewer } from './ui/imageViewer.js';
import { createHud } from './ui/hud.js';

async function main() {
  const canvas = document.querySelector('#scene');
  const roomId = defaultRoomId();
  const room = getRoom(roomId);
  const paintings = getPaintings(roomId);

  const hud = createHud();
  const startOverlay = createStartOverlay({ room, onEnter: () => enter() });

  // 작품 텍스처 로딩 진행률을 시작 화면에 그대로 보여준다
  const loadingManager = new THREE.LoadingManager();
  loadingManager.onProgress = (_url, loaded, total) =>
    startOverlay.setProgress(total ? loaded / total : 0, loaded, total);
  loadingManager.onError = (url) => console.error('[loading] 실패:', url);

  const { renderer, scene, camera, perfGuard } = createScene({ canvas, room });

  // ── 전시실 + 작품 ────────────────────────────────────────────────────────
  const { group: roomGroup, colliders, wallIndex } = buildRoom(room);
  scene.add(roomGroup);

  const { group: artGroup, targets } = await buildPaintings(paintings, wallIndex, room, loadingManager);
  scene.add(artGroup);

  // ── 조작 · 상호작용 ──────────────────────────────────────────────────────
  const player = new PlayerControls(camera, canvas, { colliders, spawn: room.spawn });
  const picker = new PaintingPicker(camera, targets);

  const viewer = createImageViewer();
  const infoPanel = createInfoPanel({ onZoom: (painting) => viewer.show(painting) });

  let openingPanel = false; // 패널을 보려고 의도적으로 잠금을 푼 경우

  function enter() {
    infoPanel.close();
    viewer.close();
    player.lock();
  }

  player.addEventListener('lock', () => {
    startOverlay.hide();
    hud.show();
  });

  player.addEventListener('unlock', () => {
    hud.hide();
    if (openingPanel) {
      openingPanel = false; // 패널을 열기 위한 해제 — 시작 화면을 띄우지 않는다
      return;
    }
    startOverlay.show();
    infoPanel.close();
  });

  document.addEventListener('mousedown', (event) => {
    // 조준점에 작품이 들어온 상태에서 클릭 → 포인터 잠금을 풀고 정보 패널을 연다.
    // 잠금이 풀려 있어야 패널의 링크를 바로 클릭할 수 있다.
    if (player.isLocked) {
      const painting = picker.current;
      if (!painting) return;
      openingPanel = true;
      infoPanel.show(painting);
      player.unlock();
      return;
    }

    // 잠금이 풀린 상태에서 전시실(캔버스)을 클릭하면 패널을 닫고 다시 잠근다.
    if (viewer.isOpen || startOverlay.isVisible) return;
    if (event.target !== canvas) return;
    infoPanel.close();
    player.lock();
  });

  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape' || player.isLocked) return;
    // 포인터가 이미 풀린 상태에서의 Esc — 열려 있는 것부터 차례로 닫는다
    if (viewer.isOpen) {
      viewer.close();
      return;
    }
    if (infoPanel.isOpen) {
      infoPanel.close();
      return;
    }
    startOverlay.show();
  });

  // ── 렌더 루프 ────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    player.update(dt);
    hud.setTarget(player.isLocked ? picker.update() : null);
    renderer.render(scene, camera);
    perfGuard(dt);
  });

  startOverlay.ready();

  // 개발 중 디버깅용 핸들 (프로덕션 번들에서는 제거된다)
  if (import.meta.env.DEV) {
    window.__museum = { scene, camera, renderer, player, picker, infoPanel, viewer, paintings, room };
  }
}

main().catch((error) => {
  console.error(error);
  const button = document.querySelector('#enter-button');
  if (button) {
    button.disabled = true;
    button.textContent = '전시실을 불러오지 못했습니다 — 콘솔을 확인하세요';
  }
});
