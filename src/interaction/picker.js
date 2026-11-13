import * as THREE from 'three';

const MAX_DISTANCE = 14; // 이 거리 안의 대상만 집을 수 있다 (m)

/**
 * 화면 한 점에서 Raycaster 를 쏘아 바라보는 대상을 찾는다.
 *
 * 회화·조각·포털을 함께 판정한다. 데스크톱은 화면 중앙(조준점),
 * 모바일은 손가락으로 탭한 좌표를 쓴다.
 *
 * @returns {{kind:'painting'|'sculpture'|'portal', painting?:object, sculpture?:object, portal?:object, object:THREE.Object3D}|null}
 */
export class Picker {
  constructor(camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_DISTANCE;
    this.targets = [];
    this.current = null;
  }

  setTargets(targets) {
    this.targets = targets;
    this.current = null;
  }

  /** @param {THREE.Vector2} [ndc] 정규화 좌표(-1~1). 없으면 화면 중앙 */
  pick(ndc = CENTER) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.targets, false)[0];
    if (!hit) return null;
    const data = hit.object.userData;
    if (data.painting) return { kind: 'painting', painting: data.painting, object: hit.object };
    if (data.sculpture) return { kind: 'sculpture', sculpture: data.sculpture, object: hit.object };
    if (data.portal) return { kind: 'portal', portal: data.portal, object: hit.object };
    return null;
  }

  /** 매 프레임 호출 — 조준점에 들어온 대상을 기억해 둔다 */
  update() {
    this.current = this.pick();
    return this.current;
  }
}

const CENTER = new THREE.Vector2(0, 0);

/** 화면 픽셀 좌표를 정규화 좌표로 */
export function toNdc(clientX, clientY) {
  return new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1,
  );
}
