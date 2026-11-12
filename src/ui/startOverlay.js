/**
 * 시작 화면: 제목 · 전시실 소개 · 조작법 · 로딩 진행률 · "입장하기" 버튼.
 * 포인터 잠금이 풀리면(Esc) 다시 나타난다.
 */
export function createStartOverlay({ room, onEnter }) {
  const overlay = document.querySelector('#start-overlay');
  const button = document.querySelector('#enter-button');
  const progressBar = document.querySelector('#load-bar');
  const progressText = document.querySelector('#load-text');
  const progressBox = document.querySelector('#load-progress');
  document.querySelector('#start-intro').textContent = room.intro;

  let ready = false;

  button.addEventListener('click', () => {
    if (!ready) return;
    overlay.classList.add('hidden');
    onEnter();
  });

  return {
    /** THREE.LoadingManager 진행률(0~1) 반영 */
    setProgress(ratio, loaded, total) {
      const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
      progressBar.style.width = `${percent}%`;
      progressBar.parentElement.setAttribute('aria-valuenow', String(percent));
      progressText.textContent = total
        ? `작품 이미지 불러오는 중… ${percent}% (${loaded}/${total})`
        : `작품 이미지 불러오는 중… ${percent}%`;
      button.textContent = `불러오는 중… ${percent}%`;
    },

    /** 에셋 로딩이 끝나 입장할 수 있게 되었을 때 */
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
  };
}
