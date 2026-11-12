/**
 * 화면 중앙 조준점과, 바라보는 작품의 이름 힌트.
 */
export function createHud() {
  const hud = document.querySelector('#hud');
  const label = hud.querySelector('#hover-label');
  let shownId = null;

  return {
    show() {
      hud.classList.remove('hidden');
      hud.removeAttribute('aria-hidden');
    },
    hide() {
      hud.classList.add('hidden');
      hud.setAttribute('aria-hidden', 'true');
    },
    /** @param {object|null} painting 조준점에 들어온 작품 (없으면 null) */
    setTarget(painting) {
      const id = painting?.id ?? null;
      if (id === shownId) return;
      shownId = id;
      hud.classList.toggle('targeting', Boolean(painting));
      if (painting) label.textContent = `${painting.titleKo} — ${painting.artistKo}`;
    },
  };
}
