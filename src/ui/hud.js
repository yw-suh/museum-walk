/**
 * 화면 위 표시: 현재 위치 막대 · 조준점 · 바라보는 대상 힌트.
 */
export function createHud({ onMenu, onAbout } = {}) {
  const hud = document.querySelector('#hud');
  const label = hud.querySelector('#hover-label');
  const locationName = document.querySelector('#loc-name');
  const locationSub = document.querySelector('#loc-sub');
  const locationCount = document.querySelector('#loc-count');
  const menuButton = document.querySelector('#loc-menu');
  const aboutButton = document.querySelector('#loc-about');
  const bar = document.querySelector('#location-bar');

  menuButton.addEventListener('click', () => onMenu?.());
  aboutButton.addEventListener('click', () => onAbout?.());

  let shownKey = null;

  return {
    show() {
      hud.classList.remove('hidden');
      hud.removeAttribute('aria-hidden');
      bar.classList.remove('hidden');
    },
    hide() {
      hud.classList.add('hidden');
      hud.setAttribute('aria-hidden', 'true');
      bar.classList.add('hidden');
    },
    /** 현재 공간 표시 갱신 */
    setRoom(room, paintingCount = 0, sculptureCount = 0) {
      locationName.textContent = room.nameKo;
      locationSub.textContent = room.subtitle;
      const parts = [];
      if (paintingCount) parts.push(`회화 ${paintingCount}점`);
      if (sculptureCount) parts.push(`조각 ${sculptureCount}점`);
      locationCount.textContent = parts.length ? parts.join(' · ') : '입장 공간';
    },
    /** @param {{kind:string, painting?:object, portal?:object}|null} target */
    setTarget(target) {
      const key = target
        ? `${target.kind}:${target.painting?.id ?? target.sculpture?.id ?? target.portal?.id}`
        : null;
      if (key === shownKey) return;
      shownKey = key;
      hud.classList.toggle('targeting', Boolean(target));
      hud.classList.toggle('portal', target?.kind === 'portal');
      if (!target) return;
      if (target.kind === 'portal') label.textContent = `입장하기 — ${target.portal.titleKo}`;
      else {
        const work = target.painting ?? target.sculpture;
        label.textContent = `${work.titleKo} — ${work.artistKo}`;
      }
    },
  };
}
