import * as THREE from 'three';
import { getRoom, getPaintings } from '../data/catalog.js';
import { buildRoom } from './buildRoom.js';
import { buildPaintings } from './buildPaintings.js';

/**
 * 공간 하나를 씬에 올리고 내리는 단위.
 *
 * 방을 옮길 때 이전 방의 지오메트리·재질·**텍스처를 모두 dispose** 한다.
 * 전시실마다 수 MB 짜리 텍스처를 쓰기 때문에, 해제하지 않으면
 * 방을 몇 번 오갈 때마다 GPU 메모리가 계속 쌓인다.
 */
export class RoomSession {
  /**
   * @param {THREE.Scene} scene
   * @param {object} room  catalog.getRoom 결과
   * @param {object} parts buildRoom/buildPaintings 결과
   */
  constructor(scene, room, parts) {
    this.scene = scene;
    this.room = room;
    this.paintings = parts.paintings;
    this.colliders = parts.colliders;
    this.pickTargets = [...parts.paintingTargets, ...parts.portalTargets];
    this.group = new THREE.Group();
    this.group.name = `room:${room.id}`;
    this.group.add(parts.roomGroup, parts.artGroup);
    scene.add(this.group);
  }

  /**
   * 공간을 만들어 씬에 올린다. 텍스처 로딩 진행률은 onProgress 로 전달된다.
   * @param {(ratio:number, loaded:number, total:number) => void} [onProgress]
   */
  static async load(scene, roomId, onProgress) {
    const room = getRoom(roomId);
    const paintings = getPaintings(roomId);

    const manager = new THREE.LoadingManager();
    if (onProgress) {
      manager.onProgress = (_url, loaded, total) => onProgress(total ? loaded / total : 1, loaded, total);
    }
    manager.onError = (url) => console.error('[loading] 실패:', url);

    const { group: roomGroup, colliders, wallIndex, portalTargets } = buildRoom(room);
    const { group: artGroup, targets: paintingTargets } = await buildPaintings(
      paintings,
      wallIndex,
      room,
      manager,
    );
    if (!paintings.length) onProgress?.(1, 0, 0); // 로비처럼 작품이 없는 공간

    return new RoomSession(scene, room, {
      roomGroup,
      artGroup,
      colliders,
      portalTargets,
      paintingTargets,
      paintings,
    });
  }

  /** 씬에서 떼고 GPU 자원을 모두 반납한다 */
  dispose() {
    this.scene.remove(this.group);
    const textures = new Set();

    this.group.traverse((object) => {
      object.geometry?.dispose();
      for (const material of toArray(object.material)) {
        for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'alphaMap']) {
          if (material[key]) textures.add(material[key]);
        }
        material.dispose();
      }
    });

    for (const texture of textures) texture.dispose();
    this.pickTargets = [];
    this.colliders = [];
  }
}

function toArray(material) {
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}
