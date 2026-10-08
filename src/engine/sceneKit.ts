import * as THREE from 'three';
import { Box2, boxFromMesh } from './collisions';

export const palette = {
  grass: 0x8fae6d,
  path: 0xd4bd8d,
  stone: 0x8f8f96,
  stoneDark: 0x565463,
  wood: 0xa5744c,
  woodDark: 0x7a5236,
  roof: 0x74463a,
  wall: 0xcbb89a,
  wallInner: 0xa89a80,
  floor: 0x7d7263,
  gold: 0xd9a441,
  bronze: 0xc18a3d,
  cloak: 0x4f7d77,
  skin: 0xd9b48f,
  hat: 0xb5651d,
  lens: 0x86c5d6,
  glow: 0xffd9a0,
  sky: 0x9cc0cf,
};

export function mat(
  color: number,
  opts?: { rough?: number; metal?: number; emissive?: number; opacity?: number },
): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.rough ?? 0.95,
    metalness: opts?.metal ?? 0.05,
    flatShading: true,
  });
  if (opts?.emissive) m.emissive = new THREE.Color(opts.emissive);
  if (opts?.opacity !== undefined) {
    m.transparent = true;
    m.opacity = opts.opacity;
  }
  return m;
}

export function addBox(
  scene: THREE.Scene,
  size: [number, number, number],
  pos: [number, number, number],
  color: number,
  opts?: { rotY?: number; colliders?: Box2[]; matOpts?: { rough?: number; metal?: number; emissive?: number; opacity?: number } },
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat(color, opts?.matOpts));
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (opts?.rotY) mesh.rotation.y = opts.rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (opts?.colliders) opts.colliders.push(boxFromMesh(mesh));
  return mesh;
}

export function addGround(scene: THREE.Scene, w: number, d: number, color: number): THREE.Mesh {
  const ground = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), mat(color));
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

export function addLights(scene: THREE.Scene, shadowExtent = 18): THREE.DirectionalLight {
  scene.add(new THREE.HemisphereLight(palette.glow, 0x30373f, 0.85));
  const dir = new THREE.DirectionalLight(0xfff1d6, 1.5);
  dir.position.set(8, 14, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -shadowExtent;
  dir.shadow.camera.right = shadowExtent;
  dir.shadow.camera.top = shadowExtent;
  dir.shadow.camera.bottom = -shadowExtent;
  dir.shadow.camera.far = 60;
  dir.shadow.bias = -0.0005;
  scene.add(dir);
  return dir;
}

export function makeLabel(text: string, scale = 1): THREE.Sprite {  const font = '600 44px Georgia, serif';
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 44;
  const h = 76;
  c.width = w;
  c.height = h;
  ctx.font = font;
  ctx.fillStyle = 'rgba(24,20,28,0.78)';
  roundRect(ctx, 0, 0, w, h, 16);
  ctx.fill();
  ctx.fillStyle = '#f4ecd8';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 22, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set((w / 160) * scale, (h / 160) * scale, 1);
  sprite.raycast = () => {};
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function dynamicLabel(
  parent: THREE.Object3D,
  pos: [number, number, number],
  scale: number,
): { set(text: string): void; dispose(): void } {
  let sprite = makeLabel('', scale);
  sprite.position.set(pos[0], pos[1], pos[2]);
  parent.add(sprite);
  const drop = () => {
    parent.remove(sprite);
    sprite.material.map?.dispose();
    sprite.material.dispose();
  };
  return {
    set(text: string) {
      drop();
      sprite = makeLabel(text, scale);
      sprite.position.set(pos[0], pos[1], pos[2]);
      parent.add(sprite);
    },
    dispose: drop,
  };
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    if (o.userData.shared) return;
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (material) {
      const list = Array.isArray(material) ? material : [material];
      for (const m of list) {
        const withMap = m as THREE.MeshStandardMaterial & { map?: THREE.Texture | null };
        if (withMap.map) withMap.map.dispose();
        m.dispose();
      }
    }
  });
  scene.clear();
}
