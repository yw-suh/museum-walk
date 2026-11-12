/**
 * 모바일 조작: 왼쪽 가상 조이스틱으로 이동, 오른쪽 드래그로 시점 회전, 탭으로 선택.
 *
 * - 화면 왼쪽 45% 를 누르면 그 자리에 조이스틱이 생긴다 (고정 위치가 아니라 누른 곳).
 * - 오른쪽을 드래그하면 시점이 돈다. 거의 움직이지 않고 떼면 "탭"으로 보고 onTap 을 부른다.
 */
const JOYSTICK_RADIUS = 56;
const TAP_SLOP = 12; // px — 이보다 적게 움직이면 탭
const TAP_TIME = 350; // ms

export function createTouchControls({ input, onTap, onPortalHint }) {
  const layer = document.querySelector('#touch-layer');
  const stick = document.querySelector('#joystick');
  const knob = document.querySelector('#joystick-knob');

  let moveTouch = null; // {id, originX, originY}
  let lookTouch = null; // {id, lastX, lastY, startX, startY, startTime, moved}
  let enabled = false;

  function setKnob(dx, dy) {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function startMove(touch) {
    moveTouch = { id: touch.identifier, originX: touch.clientX, originY: touch.clientY };
    stick.style.left = `${touch.clientX}px`;
    stick.style.top = `${touch.clientY}px`;
    stick.classList.remove('hidden');
    setKnob(0, 0);
  }

  function endMove() {
    moveTouch = null;
    stick.classList.add('hidden');
    setKnob(0, 0);
    input.setTouchMove(0, 0);
    input.run = false;
  }

  function onTouchStart(event) {
    if (!enabled) return;
    for (const touch of event.changedTouches) {
      const left = touch.clientX < window.innerWidth * 0.45;
      if (left && !moveTouch) startMove(touch);
      else if (!lookTouch) {
        lookTouch = {
          id: touch.identifier,
          lastX: touch.clientX,
          lastY: touch.clientY,
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: performance.now(),
          moved: 0,
        };
      }
    }
  }

  function onTouchMove(event) {
    if (!enabled) return;
    for (const touch of event.changedTouches) {
      if (moveTouch && touch.identifier === moveTouch.id) {
        const dx = touch.clientX - moveTouch.originX;
        const dy = touch.clientY - moveTouch.originY;
        const distance = Math.hypot(dx, dy);
        const clamped = Math.min(distance, JOYSTICK_RADIUS);
        const nx = distance ? (dx / distance) * clamped : 0;
        const ny = distance ? (dy / distance) * clamped : 0;
        setKnob(nx, ny);
        input.setTouchMove(nx / JOYSTICK_RADIUS, -ny / JOYSTICK_RADIUS);
        input.run = distance > JOYSTICK_RADIUS * 0.92; // 끝까지 밀면 빠르게 걷기
      } else if (lookTouch && touch.identifier === lookTouch.id) {
        input.addTouchLook(touch.clientX - lookTouch.lastX, touch.clientY - lookTouch.lastY);
        lookTouch.moved += Math.hypot(touch.clientX - lookTouch.lastX, touch.clientY - lookTouch.lastY);
        lookTouch.lastX = touch.clientX;
        lookTouch.lastY = touch.clientY;
      }
    }
  }

  function onTouchEnd(event) {
    if (!enabled) return;
    for (const touch of event.changedTouches) {
      if (moveTouch && touch.identifier === moveTouch.id) endMove();
      else if (lookTouch && touch.identifier === lookTouch.id) {
        const quick = performance.now() - lookTouch.startTime < TAP_TIME;
        if (quick && lookTouch.moved < TAP_SLOP) onTap?.(touch.clientX, touch.clientY);
        lookTouch = null;
      }
    }
  }

  layer.addEventListener('touchstart', onTouchStart, { passive: true });
  layer.addEventListener('touchmove', onTouchMove, { passive: true });
  layer.addEventListener('touchend', onTouchEnd, { passive: true });
  layer.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return {
    enable() {
      enabled = true;
      layer.classList.remove('hidden');
    },
    disable() {
      enabled = false;
      endMove();
      lookTouch = null;
      layer.classList.add('hidden');
    },
    /** 바라보는 포털이 있을 때 "입장" 버튼을 띄운다 */
    setPortalHint(portal) {
      onPortalHint?.(portal);
    },
  };
}
