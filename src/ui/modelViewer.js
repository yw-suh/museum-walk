import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * 조각 "돌려 보기" — 전체 화면에서 조각만 따로 보여 준다.
 *
 * 전시실 씬과 완전히 분리된 작은 씬을 쓴다. 닫으면 렌더 루프를 멈추고
 * 지오메트리·재질·렌더러를 해제하므로, 열어 둔 동안에만 자원을 쓴다.
 *
 * 조작: 드래그 회전 · 휠/핀치 확대 · Esc 또는 × 로 닫기
 */
export function createModelViewer({ onClose } = {}) {
  const root = document.querySelector('#model-viewer');
  const holder = root.querySelector('#model-canvas-holder');
  const caption = root.querySelector('#model-caption');
  const hint = root.querySelector('#model-hint');
  const status = root.querySelector('#model-status');
  const closeButton = root.querySelector('#model-close');

  let open = false;
  let renderer = null;
  let scene = null;
  let camera = null;
  let controls = null;
  let current = null;
  let frame = 0;

  function setup() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = false;
    holder.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);

    // 박물관 조명처럼 위·앞·뒤에서 비춘다
    scene.add(new THREE.HemisphereLight('#ffffff', '#4a4a52', 2.0));
    const key = new THREE.DirectionalLight('#fff6e8', 2.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#cfe0ff', 1.1);
    rim.position.set(-4, 3, -4);
    scene.add(rim);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI - 0.15;

    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!renderer) return;
    const rect = holder.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }

  function loop() {
    frame = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }

  function clearModel() {
    if (!current) return;
    scene.remove(current);
    current.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material?.dispose();
    });
    current = null;
  }

  async function show(sculpture) {
    open = true;
    root.classList.remove('hidden');
    if (!renderer) setup();
    resize();

    caption.textContent =
      `${sculpture.titleKo} · ${sculpture.artistKo} · ${sculpture.yearLabel}` +
      ` · 실제 높이 ${(sculpture.size.heightCm / 100).toFixed(2)} m`;
    hint.textContent = '드래그로 회전 · 휠/핀치로 확대 · Esc 로 닫기';

    clearModel();
    status.textContent = '3D 모델 불러오는 중…';
    status.classList.remove('hidden');

    try {
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(sculpture.model);
      if (!open) {
        // 로딩 중에 닫혔다면 바로 버린다
        gltf.scene.traverse((o) => o.geometry?.dispose());
        return;
      }
      current = gltf.scene;
      scene.add(current);

      // 모델은 바닥 중앙이 원점이므로, 높이의 절반을 보도록 카메라를 둔다
      const box = new THREE.Box3().setFromObject(current);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.5;
      const distance = radius / Math.tan((camera.fov * Math.PI) / 360) + radius * 0.4;

      controls.target.copy(center);
      camera.position.set(center.x + distance * 0.35, center.y + size.y * 0.12, center.z + distance);
      camera.near = Math.max(0.01, distance / 200);
      camera.far = distance * 12;
      camera.updateProjectionMatrix();
      controls.minDistance = radius * 0.9;
      controls.maxDistance = distance * 2.6;
      controls.update();

      status.classList.add('hidden');
      if (!frame) loop();
    } catch (error) {
      console.error(error);
      status.textContent = '3D 모델을 불러오지 못했습니다.';
    }
  }

  function close() {
    if (!open) return;
    open = false;
    root.classList.add('hidden');
    cancelAnimationFrame(frame);
    frame = 0;
    clearModel();
    onClose?.();
  }

  closeButton.addEventListener('click', close);
  root.addEventListener('mousedown', (e) => {
    if (e.target === root) close();
    e.stopPropagation();
  });

  return {
    show,
    close,
    get isOpen() {
      return open;
    },
  };
}
