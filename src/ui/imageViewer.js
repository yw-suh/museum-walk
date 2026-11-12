/**
 * 전체 화면 작품 이미지 뷰어 ("크게 보기").
 *
 * - 뷰어용 고해상도 이미지(긴 변 4096px WebP)는 **열 때 처음 한 번만** 내려받는다.
 *   한 번 받은 이미지는 캐시해 두고 다음부터는 즉시 연다.
 * - 마우스 휠 / 트랙패드 핀치로 확대·축소, 드래그로 이동.
 * - 터치는 한 손가락 드래그 이동 + 두 손가락 핀치 확대.
 * - Esc 또는 × 로 닫는다.
 */
const MIN_SCALE = 1;
const MAX_SCALE = 8;

export function createImageViewer({ onClose } = {}) {
  const root = document.querySelector('#viewer');
  const img = root.querySelector('#viewer-img');
  const caption = root.querySelector('#viewer-caption');
  const hint = root.querySelector('#viewer-hint');
  const status = root.querySelector('#viewer-status');
  const closeBtn = root.querySelector('#viewer-close');
  const zoomLabel = root.querySelector('#viewer-zoom');

  const cache = new Map(); // painting.id → 로딩 완료된 src
  let open = false;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = null;
  let pinch = null;

  function applyTransform() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    root.classList.toggle('zoomed', scale > 1.01);
  }

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  /** 확대 중 이미지가 화면 밖으로 너무 멀리 나가지 않도록 가둔다 */
  function clampPan() {
    const rect = root.getBoundingClientRect();
    const limitX = Math.max(0, (img.clientWidth * scale - rect.width) / 2);
    const limitY = Math.max(0, (img.clientHeight * scale - rect.height) / 2);
    tx = Math.min(limitX, Math.max(-limitX, tx));
    ty = Math.min(limitY, Math.max(-limitY, ty));
  }

  /** 포인터 위치를 기준점으로 확대/축소 */
  function zoomAt(clientX, clientY, factor) {
    const rect = root.getBoundingClientRect();
    const originX = clientX - rect.left - rect.width / 2;
    const originY = clientY - rect.top - rect.height / 2;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const ratio = next / scale;
    tx = originX - (originX - tx) * ratio;
    ty = originY - (originY - ty) * ratio;
    scale = next;
    if (scale <= MIN_SCALE + 0.001) {
      tx = 0;
      ty = 0;
    }
    clampPan();
    applyTransform();
  }

  async function show(painting) {
    const src = painting.imageLarge ?? painting.image;
    open = true;
    reset();
    root.classList.remove('hidden');
    caption.textContent =
      `${painting.titleKo} · ${painting.artistKo} · ${painting.yearLabel}` +
      ` · 실제 ${painting.size.heightCm} × ${painting.size.widthCm} cm`;
    hint.textContent = '휠/핀치로 확대 · 드래그로 이동 · Esc 로 닫기';

    if (cache.has(painting.id)) {
      img.src = cache.get(painting.id);
      status.classList.add('hidden');
      return;
    }

    // 지연 로딩: 여기서 처음으로 고해상도 파일을 요청한다
    img.removeAttribute('src');
    status.textContent = '고해상도 이미지 불러오는 중…';
    status.classList.remove('hidden');
    try {
      await new Promise((resolve, reject) => {
        const probe = new Image();
        probe.onload = resolve;
        probe.onerror = () => reject(new Error(src));
        probe.src = src;
      });
      if (!open) return; // 로딩 중에 닫혔다면 버린다
      cache.set(painting.id, src);
      img.src = src;
      status.classList.add('hidden');
    } catch {
      status.textContent = '이미지를 불러오지 못했습니다.';
    }
  }

  function close() {
    if (!open) return;
    open = false;
    root.classList.add('hidden');
    reset();
    onClose?.();
  }

  closeBtn.addEventListener('click', close);

  // 배경(이미지 바깥)을 클릭하면 닫기
  root.addEventListener('mousedown', (e) => {
    if (e.target !== img) {
      if (e.target === root) close();
      return;
    }
    dragging = { x: e.clientX - tx, y: e.clientY - ty };
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    tx = e.clientX - dragging.x;
    ty = e.clientY - dragging.y;
    clampPan();
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    dragging = null;
  });

  root.addEventListener(
    'wheel',
    (e) => {
      if (!open) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  img.addEventListener('dblclick', (e) => zoomAt(e.clientX, e.clientY, scale > 1.5 ? 1 / scale : 2.5));

  // 터치: 1손가락 이동, 2손가락 핀치
  root.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 1) {
        dragging = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty };
      } else if (e.touches.length === 2) {
        dragging = null;
        pinch = { distance: touchDistance(e.touches) };
      }
    },
    { passive: true },
  );
  root.addEventListener(
    'touchmove',
    (e) => {
      if (!open) return;
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const distance = touchDistance(e.touches);
        const mid = touchMidpoint(e.touches);
        zoomAt(mid.x, mid.y, distance / pinch.distance);
        pinch.distance = distance;
      } else if (e.touches.length === 1 && dragging) {
        e.preventDefault();
        tx = e.touches[0].clientX - dragging.x;
        ty = e.touches[0].clientY - dragging.y;
        clampPan();
        applyTransform();
      }
    },
    { passive: false },
  );
  root.addEventListener('touchend', () => {
    dragging = null;
    pinch = null;
  });

  return {
    show,
    close,
    get isOpen() {
      return open;
    },
  };
}

function touchDistance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function touchMidpoint(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}
