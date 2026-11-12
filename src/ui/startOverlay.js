import { AVATAR_COLORS } from '../core/PlayerState.js';
import { loadProfile, saveProfile, sanitizeName, MAX_NAME } from '../core/profile.js';
import { isTouchDevice } from '../core/input.js';

/**
 * 시작 화면: 제목 · 소개 · 닉네임 · 아바타 색상 · 조작법 · 로딩 진행률 · 입장 버튼.
 * 관람 중 포인터 잠금이 풀리면(Esc) 다시 나타난다.
 */
export function createStartOverlay({ onEnter }) {
  const overlay = document.querySelector('#start-overlay');
  const button = document.querySelector('#enter-button');
  const nameInput = document.querySelector('#nickname');
  const swatches = document.querySelector('#avatar-colors');
  const progressBar = document.querySelector('#load-bar');
  const progressText = document.querySelector('#load-text');
  const progressBox = document.querySelector('#load-progress');
  const controlsDesktop = document.querySelector('#controls-desktop');
  const controlsTouch = document.querySelector('#controls-touch');

  // 기기에 맞는 조작 안내만 보여 준다
  (isTouchDevice ? controlsDesktop : controlsTouch).classList.add('hidden');

  const saved = loadProfile();
  const profile = {
    name: saved?.name ?? '',
    color: saved?.color ?? AVATAR_COLORS[0].hex,
  };

  nameInput.value = profile.name;
  nameInput.maxLength = MAX_NAME;
  nameInput.addEventListener('input', () => {
    profile.name = nameInput.value;
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && ready) button.click();
  });

  swatches.replaceChildren(
    ...AVATAR_COLORS.map((color) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.style.background = color.hex;
      swatch.title = color.label;
      swatch.setAttribute('aria-label', `아바타 색상 ${color.label}`);
      swatch.dataset.hex = color.hex;
      swatch.addEventListener('click', () => {
        profile.color = color.hex;
        paintSelection();
      });
      return swatch;
    }),
  );

  function paintSelection() {
    for (const swatch of swatches.children) {
      swatch.classList.toggle('selected', swatch.dataset.hex === profile.color);
    }
  }
  paintSelection();

  let ready = false;

  button.addEventListener('click', () => {
    if (!ready) return;
    const resolved = { name: sanitizeName(profile.name), color: profile.color };
    nameInput.value = resolved.name;
    saveProfile(resolved);
    overlay.classList.add('hidden');
    onEnter(resolved);
  });

  return {
    /** THREE.LoadingManager 진행률(0~1) 반영 */
    setProgress(ratio, loaded, total) {
      const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
      progressBar.style.width = `${percent}%`;
      progressBar.parentElement.setAttribute('aria-valuenow', String(percent));
      progressText.textContent = total
        ? `작품 이미지 불러오는 중… ${percent}% (${loaded}/${total})`
        : `전시실 준비 중… ${percent}%`;
      if (!ready) button.textContent = `불러오는 중… ${percent}%`;
    },

    ready() {
      ready = true;
      button.disabled = false;
      button.textContent = '입장하기';
      progressBar.style.width = '100%';
      progressText.textContent = '준비 완료';
      progressBox.classList.add('done');
    },

    show() {
      overlay.classList.remove('hidden');
      if (ready) button.textContent = '다시 입장하기';
    },
    hide() {
      overlay.classList.add('hidden');
    },
    get isVisible() {
      return !overlay.classList.contains('hidden');
    },
    get profile() {
      return { name: sanitizeName(profile.name), color: profile.color };
    },
  };
}
