/**
 * 네트워크 어댑터 인터페이스.
 *
 * Phase 3 에서 실시간 다중 접속을 붙일 때, 이 네 개의 메서드만 구현한
 * 클래스를 만들어 main.js 에서 갈아 끼우면 된다. 나머지 코드는 손대지 않는다.
 *
 *   connect(player)        접속. 내 PlayerState 를 넘긴다.
 *   sendState(snapshot)    내 상태를 보낸다 (매 프레임이 아니라 일정 간격으로).
 *   onPlayersUpdate(cb)    다른 사람들의 스냅샷 배열을 받는다. 해제 함수를 돌려준다.
 *   disconnect()           접속 종료.
 *
 * 구현체가 지켜야 할 약속:
 *  - onPlayersUpdate 로 넘기는 배열에는 **내 플레이어를 포함하지 않는다.**
 *  - 각 스냅샷은 PlayerState.toSnapshot() 과 같은 모양이어야 한다.
 *  - roomId 가 다른 플레이어도 그대로 넘긴다. 걸러내는 일은 화면 쪽에서 한다.
 */
export class NetworkAdapter {
  constructor() {
    this._handlers = new Set();
  }

  /** @param {import('../core/PlayerState.js').PlayerState} player */
  // eslint-disable-next-line no-unused-vars
  async connect(player) {}

  /** @param {object} snapshot @see PlayerState#toSnapshot */
  // eslint-disable-next-line no-unused-vars
  sendState(snapshot) {}

  /** @param {(players: object[]) => void} callback @returns {() => void} 해제 함수 */
  onPlayersUpdate(callback) {
    this._handlers.add(callback);
    return () => this._handlers.delete(callback);
  }

  disconnect() {
    this._handlers.clear();
  }

  /** 구현체가 수신 결과를 흘려보낼 때 쓴다 */
  _emit(players) {
    for (const handler of this._handlers) handler(players);
  }

  /** 화면에 보여 줄 접속 상태 문구 */
  get statusLabel() {
    return '오프라인';
  }
}

/**
 * 혼자 보는 기본 구현. 아무것도 보내지 않고 아무도 돌려주지 않는다.
 * Phase 2 의 기본값이며, 네트워크 코드가 없어도 앱이 완전히 동작함을 보장한다.
 */
export class LocalAdapter extends NetworkAdapter {
  async connect(player) {
    this.player = player;
    this._emit([]);
  }

  get statusLabel() {
    return '혼자 관람 중';
  }
}
