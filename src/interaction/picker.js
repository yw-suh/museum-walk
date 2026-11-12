import * as THREE from 'three';

const MAX_DISTANCE = 12; // 이 거리 안의 작품만 집을 수 있다 (m)

/**
 * 화면 중앙(조준점)에서 Raycaster 를 쏘아 바라보는 작품을 찾는다.
 */
export class PaintingPicker {
  constructor(camera, targets) {
    this.camera = camera;
    this.targets = targets;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_DISTANCE;
    this.center = new THREE.Vector2(0, 0);
    this.current = null;
  }

  /** @returns {object|null} 조준점에 들어온 작품 데이터 */
  update() {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hit = this.raycaster.intersectObjects(this.targets, false)[0];
    this.current = hit ? hit.object.userData.painting : null;
    return this.current;
  }
}
