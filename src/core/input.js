/**
 * 키보드와 터치를 하나의 입력원으로 묶는다.
 *
 * 어느 쪽이든 결과는 같다:
 *   move  : {x, y}  — y 가 +면 전진, x 가 +면 오른쪽 (크기 0~1)
 *   look  : {dx, dy} — 이번 프레임에 돌아야 할 양 (읽으면 0으로 비워짐)
 *   run   : 빠르게 걷기
 *
 * 데스크톱은 포인터 잠금 + WASD, 모바일은 왼쪽 가상 조이스틱 + 오른쪽 드래그.
 */
const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_SENSITIVITY = 0.0042;

export const isTouchDevice =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

export class InputSource {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.look = { dx: 0, dy: 0 };
    this.run = false;
    this.enabled = false;

    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();
    this._onMouseMove = (e) => {
      if (!this.enabled) return;
      this.look.dx -= e.movementX * MOUSE_SENSITIVITY;
      this.look.dy -= e.movementY * MOUSE_SENSITIVITY;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  /** 터치 컨트롤이 매 프레임 넣어 주는 값 */
  setTouchMove(x, y) {
    this.move.x = x;
    this.move.y = y;
  }

  addTouchLook(dx, dy) {
    this.look.dx -= dx * TOUCH_SENSITIVITY;
    this.look.dy -= dy * TOUCH_SENSITIVITY;
  }

  /** 이번 프레임의 이동 입력 (키보드와 터치를 합친 값) */
  readMove() {
    const k = this.keys;
    const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const ky = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const x = kx || this.move.x;
    const y = ky || this.move.y;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  /** 읽으면서 비운다 — 같은 입력이 두 번 적용되지 않도록 */
  readLook() {
    const out = { dx: this.look.dx, dy: this.look.dy };
    this.look.dx = 0;
    this.look.dy = 0;
    return out;
  }

  isRunning() {
    return this.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('mousemove', this._onMouseMove);
  }
}
