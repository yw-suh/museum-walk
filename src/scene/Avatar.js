import * as THREE from 'three';

/**
 * 단순하고 귀여운 로우폴리 인체형 아바타.
 *
 * **내 아바타와 원격 아바타가 같은 클래스를 쓴다.**
 * 차이는 update() 에 넣어 주는 상태가 내 컨트롤러에서 오느냐
 * 네트워크에서 오느냐 뿐이다.
 */
const HEAD_R = 0.17;
const BODY_H = 0.52;
const LEG_H = 0.46;
const TOTAL_H = 1.62; // 머리 꼭대기까지

export class Avatar {
  /** @param {{name: string, color: string}} options */
  constructor({ name = '관람객', color = '#e2725b' } = {}) {
    this.root = new THREE.Group();
    this.root.name = `avatar:${name}`;

    const skin = new THREE.MeshStandardMaterial({ color: '#f0d2bb', roughness: 0.85 });
    this.bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.03 });
    this.materials = [skin, this.bodyMaterial];

    // 몸통 — 아래가 살짝 좁은 원통(캡슐 느낌)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, BODY_H - 0.2, 4, 12), this.bodyMaterial);
    torso.position.y = LEG_H + BODY_H / 2;
    this.root.add(torso);

    // 머리
    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 18, 14), skin);
    head.position.y = LEG_H + BODY_H + HEAD_R * 0.86;
    this.root.add(head);
    this.head = head;

    // 머리카락처럼 보이는 얇은 캡
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_R * 1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      this.bodyMaterial,
    );
    cap.position.copy(head.position);
    cap.position.y += 0.015;
    this.root.add(cap);

    // 팔다리 — 흔들리도록 피벗 그룹에 매단다
    this.limbs = {
      armL: this._limb(-0.255, LEG_H + BODY_H - 0.06, 0.34, 0.055, skin),
      armR: this._limb(0.255, LEG_H + BODY_H - 0.06, 0.34, 0.055, skin),
      legL: this._limb(-0.1, LEG_H, LEG_H, 0.072, this.bodyMaterial),
      legR: this._limb(0.1, LEG_H, LEG_H, 0.072, this.bodyMaterial),
    };

    this.label = makeNameTag(name);
    this.label.position.y = TOTAL_H + 0.28;
    this.root.add(this.label);

    this.phase = 0;
    this.name = name;
  }

  _limb(x, y, length, radius, material) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - radius * 2, 3, 8), material);
    mesh.position.y = -length / 2;
    pivot.add(mesh);
    this.root.add(pivot);
    return pivot;
  }

  get object3D() {
    return this.root;
  }

  setVisible(visible) {
    this.root.visible = visible;
  }

  setColor(color) {
    this.bodyMaterial.color.set(color);
  }

  setName(name) {
    if (name === this.name) return;
    this.name = name;
    this.root.remove(this.label);
    disposeSprite(this.label);
    this.label = makeNameTag(name);
    this.label.position.y = TOTAL_H + 0.28;
    this.root.add(this.label);
  }

  /**
   * @param {number} dt 초
   * @param {{position: number[], rotation: number, moving: boolean}} state
   */
  update(dt, state) {
    this.root.position.set(state.position[0], state.position[1], state.position[2]);
    this.root.rotation.y = state.rotation;

    // 걷기: 팔다리를 서로 반대로 흔들고, 몸을 아주 살짝 위아래로 튕긴다
    const target = state.moving ? 1 : 0;
    this.phase += dt * (state.moving ? 9 : 0);
    const swing = Math.sin(this.phase) * 0.55 * target;
    this.limbs.legL.rotation.x = swing;
    this.limbs.legR.rotation.x = -swing;
    this.limbs.armL.rotation.x = -swing * 0.75;
    this.limbs.armR.rotation.x = swing * 0.75;
    this.root.position.y += Math.abs(Math.sin(this.phase)) * 0.035 * target;
  }

  dispose() {
    this.root.traverse((o) => o.geometry?.dispose());
    for (const m of this.materials) m.dispose();
    disposeSprite(this.label);
    this.root.removeFromParent();
  }
}

/** 머리 위 이름표 — 항상 카메라를 향하는 스프라이트 */
function makeNameTag(name) {
  const pad = 22;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = "600 44px 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif";

  ctx.font = font;
  const width = Math.ceil(ctx.measureText(name).width) + pad * 2;
  canvas.width = Math.max(96, width);
  canvas.height = 92;

  const c = canvas.getContext('2d');
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  roundRect(c, 0, 14, canvas.width, 64, 16);
  c.fillStyle = 'rgba(10, 18, 30, 0.74)';
  c.fill();
  c.strokeStyle = 'rgba(201, 169, 97, 0.65)';
  c.lineWidth = 2;
  c.stroke();

  c.fillStyle = '#f3eee4';
  c.fillText(name, canvas.width / 2, 47);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, toneMapped: false }),
  );
  sprite.scale.set((canvas.width / canvas.height) * 0.42, 0.42, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disposeSprite(sprite) {
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

export { TOTAL_H as AVATAR_HEIGHT };
