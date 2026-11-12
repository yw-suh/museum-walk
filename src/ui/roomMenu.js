/**
 * 전시실 목록 메뉴 (M 키 또는 상단 위치 막대의 버튼).
 */
export function createRoomMenu({ rooms, onSelect }) {
  const root = document.querySelector('#room-menu');
  const list = root.querySelector('#room-menu-list');
  const closeButton = root.querySelector('#room-menu-close');

  let currentRoomId = null;

  function render() {
    list.replaceChildren(
      ...rooms.map((room) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'room-card';
        button.disabled = room.id === currentRoomId;

        const name = document.createElement('span');
        name.className = 'room-card-name';
        name.textContent = room.menuLabel ?? room.nameKo;

        const sub = document.createElement('span');
        sub.className = 'room-card-sub';
        sub.textContent = room.subtitle;

        const meta = document.createElement('span');
        meta.className = 'room-card-meta';
        meta.textContent =
          room.id === currentRoomId
            ? '지금 여기'
            : room.paintingCount
              ? `작품 ${room.paintingCount}점`
              : '입장 공간';

        button.append(name, sub, meta);
        button.addEventListener('click', () => {
          close();
          onSelect(room.id);
        });
        return button;
      }),
    );
  }

  function open() {
    render();
    root.classList.remove('hidden');
  }

  function close() {
    root.classList.add('hidden');
  }

  closeButton.addEventListener('click', close);
  root.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    if (e.target === root) close();
  });

  return {
    open,
    close,
    toggle() {
      if (this.isOpen) close();
      else open();
    },
    setCurrent(roomId) {
      currentRoomId = roomId;
    },
    get isOpen() {
      return !root.classList.contains('hidden');
    },
  };
}
