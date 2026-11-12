import * as THREE from 'three';
import './style.css';

import { listRooms, getRoom, defaultRoomId } from './data/catalog.js';
import { PlayerState } from './core/PlayerState.js';
import { InputSource, isTouchDevice } from './core/input.js';
import { readRoute, writeRoom, onRouteChange } from './core/router.js';

import { createScene } from './scene/createScene.js';
import { RoomSession } from './scene/RoomSession.js';
import { PlayerController } from './scene/PlayerController.js';
import { Picker, toNdc } from './interaction/picker.js';

import { LocalAdapter } from './net/NetworkAdapter.js';
import { BotAdapter } from './net/BotAdapter.js';
import { RemoteAvatarGroup } from './net/RemoteAvatar.js';

import { createStartOverlay } from './ui/startOverlay.js';
import { createInfoPanel } from './ui/infoPanel.js';
import { createImageViewer } from './ui/imageViewer.js';
import { createHud } from './ui/hud.js';
import { createRoomMenu } from './ui/roomMenu.js';
import { createTouchControls } from './ui/touchControls.js';
import { createDebugOverlay } from './ui/debugOverlay.js';

const NET_SEND_INTERVAL = 1 / 12; // 초당 12번 — Phase 3 에서 서버로 보낼 주기

async function main() {
  const canvas = document.querySelector('#scene');
  const route = readRoute();
  const rooms = listRooms();
  const startRoomId = route.roomId ?? defaultRoomId();

  document.body.classList.toggle('touch', isTouchDevice);

  // ── 상태 · 입력 ──────────────────────────────────────────────────────────
  const player = new PlayerState({ roomId: startRoomId });
  const input = new InputSource(canvas);

  const { renderer, scene, camera, perfGuard } = createScene({ canvas, room: getRoom(startRoomId) });
  const controller = new PlayerController(camera, input, player);
  controller.setLockTarget(canvas);
  scene.add(controller.avatar.object3D);

  const picker = new Picker(camera);
  const remotes = new RemoteAvatarGroup(scene);

  // ── 네트워크 (Phase 3 에서 이 한 줄만 실시간 구현으로 바꾸면 된다) ──────
  const net = route.bots > 0 ? new BotAdapter(route.bots) : new LocalAdapter();
  net.onPlayersUpdate((players) => remotes.sync(players, player.roomId));

  // ── UI ───────────────────────────────────────────────────────────────────
  const viewer = createImageViewer();
  const infoPanel = createInfoPanel({ onZoom: (painting) => viewer.show(painting) });
  const roomMenu = createRoomMenu({ rooms, onSelect: (id) => travelTo(id) });
  const hud = createHud({ onMenu: () => roomMenu.toggle() });
  const startOverlay = createStartOverlay({ onEnter: enter });
  const debugTick = route.debug ? createDebugOverlay(renderer) : null;

  const travelEl = document.querySelector('#travel');
  const travelName = document.querySelector('#travel-name');
  const travelBar = document.querySelector('#travel-bar');
  const travelText = document.querySelector('#travel-text');

  const touchEnter = document.querySelector('#touch-enter');
  const touchView = document.querySelector('#touch-view');
  const touch = createTouchControls({
    input,
    onTap: (x, y) => handlePick(picker.pick(toNdc(x, y))),
  });
  touchView.addEventListener('click', () => controller.toggleView());
  touchEnter.addEventListener('click', () => {
    if (pendingPortal) travelTo(pendingPortal.target);
  });

  // ── 공간 로딩 ────────────────────────────────────────────────────────────
  let session = null;
  let traveling = false;
  let pendingPortal = null;

  async function loadRoom(roomId, { initial = false } = {}) {
    traveling = true;
    const room = getRoom(roomId);

    if (!initial) {
      travelName.textContent = room.nameKo;
      travelBar.style.width = '0%';
      travelText.textContent = '불러오는 중…';
      travelEl.classList.remove('hidden');
    }

    const onProgress = (ratio, loaded, total) => {
      const percent = Math.round(ratio * 100);
      if (initial) startOverlay.setProgress(ratio, loaded, total);
      else {
        travelBar.style.width = `${percent}%`;
        travelText.textContent = total ? `작품 이미지 ${loaded}/${total} · ${percent}%` : `${percent}%`;
      }
    };

    const next = await RoomSession.load(scene, roomId, onProgress);

    // 새 방이 준비된 뒤에 이전 방을 해제한다 (화면이 비는 순간이 없도록)
    session?.dispose();
    session = next;

    player.roomId = roomId;
    controller.setRoom(room, session.colliders);
    picker.setTargets(session.pickTargets);
    hud.setRoom(room, session.paintings.length);
    roomMenu.setCurrent(roomId);
    remotes.clear();
    if (net instanceof BotAdapter) net.spawn(roomId);

    scene.background = new THREE.Color(room.materials.wainscot);
    scene.fog = new THREE.Fog(room.materials.wainscot, 26, 90);
    applyRoomLighting(scene, room);

    travelEl.classList.add('hidden');
    traveling = false;
    onProgress(1, 0, 0);
  }

  async function travelTo(roomId, { fromHistory = false } = {}) {
    if (traveling || roomId === player.roomId) return;
    infoPanel.close();
    viewer.close();
    roomMenu.close();
    await loadRoom(roomId);
    if (!fromHistory) writeRoom(roomId);
  }

  await loadRoom(startRoomId, { initial: true });
  writeRoom(startRoomId, { replace: true });
  onRouteChange((r) => travelTo(r.roomId ?? defaultRoomId(), { fromHistory: true }));

  // ── 입장 · 잠금 ──────────────────────────────────────────────────────────
  function enter(profile) {
    player.name = profile.name;
    player.color = profile.color;
    controller.avatar.setName(profile.name);
    controller.avatar.setColor(profile.color);
    net.connect(player);

    infoPanel.close();
    viewer.close();
    if (isTouchDevice) {
      controller.enableWithoutLock();
      touch.enable();
    } else {
      controller.lock();
    }
  }

  controller.addEventListener('lock', () => {
    startOverlay.hide();
    hud.show();
  });

  controller.addEventListener('unlock', () => {
    hud.hide();
    if (openingPanel) {
      openingPanel = false; // 패널을 보려고 푼 것 — 시작 화면을 띄우지 않는다
      return;
    }
    startOverlay.show();
    infoPanel.close();
  });

  let openingPanel = false;

  /** 작품 → 정보 패널, 포털 → 공간 이동 */
  function handlePick(hit) {
    if (!hit) return false;
    if (hit.kind === 'portal') {
      travelTo(hit.portal.target);
      return true;
    }
    const world = hit.object.getWorldPosition(new THREE.Vector3());
    controller.faceArtwork(world, hit.object.userData.normal, hit.painting.placement.viewFrom);
    infoPanel.show(hit.painting);
    if (!isTouchDevice) {
      openingPanel = true;
      controller.unlock();
    }
    return true;
  }

  document.addEventListener('mousedown', (event) => {
    if (isTouchDevice || traveling) return;

    if (controller.locked) {
      handlePick(picker.current);
      return;
    }
    // 잠금이 풀린 상태에서 전시실을 클릭하면 패널을 닫고 다시 잠근다
    if (viewer.isOpen || roomMenu.isOpen || startOverlay.isVisible) return;
    if (event.target !== canvas) return;
    infoPanel.close();
    controller.lock();
  });

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;

    if (event.code === 'KeyV') {
      controller.toggleView();
      return;
    }
    if (event.code === 'KeyM' && !startOverlay.isVisible) {
      roomMenu.toggle();
      return;
    }
    if (event.code === 'KeyE' && controller.locked && picker.current?.kind === 'portal') {
      travelTo(picker.current.portal.target);
      return;
    }
    if (event.code !== 'Escape' || controller.locked) return;

    if (viewer.isOpen) viewer.close();
    else if (roomMenu.isOpen) roomMenu.close();
    else if (infoPanel.isOpen) infoPanel.close();
    else startOverlay.show();
  });

  // ── 렌더 루프 ────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let netAccumulator = 0;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);

    controller.frozen = infoPanel.isOpen || viewer.isOpen || roomMenu.isOpen;
    controller.update(dt);
    remotes.update(dt);

    const target = controller.locked && !controller.frozen && !traveling ? picker.update() : null;
    hud.setTarget(target);
    updatePortalHint(target);

    netAccumulator += dt;
    if (netAccumulator >= NET_SEND_INTERVAL) {
      netAccumulator = 0;
      net.sendState(player.toSnapshot());
    }

    renderer.render(scene, camera);
    perfGuard(dt);
    debugTick?.(dt, {
      roomId: player.roomId,
      viewMode: controller.viewMode,
      avatars: remotes.count,
      position: player.position,
    });
  });

  /** 모바일에서 문을 바라보면 "입장하기" 버튼을 띄운다 */
  function updatePortalHint(target) {
    if (!isTouchDevice) return;
    pendingPortal = target?.kind === 'portal' ? target.portal : null;
    touchEnter.classList.toggle('hidden', !pendingPortal);
    if (pendingPortal) touchEnter.textContent = `${pendingPortal.titleKo} 입장`;
  }

  startOverlay.ready();

  if (import.meta.env.DEV) {
    window.__museum = {
      scene, camera, renderer, controller, picker, infoPanel, viewer, roomMenu,
      player, net, remotes, travelTo,
      get session() { return session; },
    };
  }
}

/** 방마다 다른 조명으로 갈아 끼운다 (조명은 씬에 직접 붙어 있다) */
function applyRoomLighting(scene, room) {
  const { hemisphere, fill, fillBack } = room.lighting;
  for (const light of scene.children.filter((o) => o.userData.roomLight)) {
    scene.remove(light);
    light.dispose?.();
  }

  const hemi = new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity);
  hemi.position.set(0, room.dimensions.height, 0);
  hemi.userData.roomLight = true;
  scene.add(hemi);

  for (const light of [fill, fillBack].filter(Boolean)) {
    const dir = new THREE.DirectionalLight(light.color, light.intensity);
    dir.position.set(...light.position);
    dir.userData.roomLight = true;
    scene.add(dir);
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
