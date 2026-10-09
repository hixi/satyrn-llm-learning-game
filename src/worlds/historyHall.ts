import * as THREE from 'three';
import { Box2 } from '../engine/collisions';
import { addBox, dynamicLabel, mat, palette } from '../engine/sceneKit';
import { Interactable, World, WorldContext } from '../game/world';

const EXHIBITS: { id: string; name: string; x: number; color: number }[] = [
  { id: 'fit', name: 'Does it fit?', x: -5.4, color: 0xd9a441 },
  { id: 'piano', name: 'The piano', x: -1.8, color: 0xcf7a2e },
  { id: 'words', name: 'Where words live', x: 1.8, color: 0x7fb069 },
  { id: 'sure', name: 'Sounding sure', x: 5.4, color: 0x9a8fd4 },
];

/** A quiet hall with objects on plinths. Use one and the view zooms into it. */
export function createHistoryHall(ctx: WorldContext, spawnKey: string): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1a20);

  const colliders: Box2[] = [];
  const bounds: Box2 = { minX: -7.1, maxX: 7.1, minZ: -5.0, maxZ: 5.0 };
  const interactables: Interactable[] = [];

  addBox(scene, [15.6, 0.2, 11.6], [0, -0.1, 0], palette.floor);
  addBox(scene, [0.5, 3.4, 11.6], [-7.5, 1.7, 0], palette.wallInner, { colliders });
  addBox(scene, [0.5, 3.4, 11.6], [7.5, 1.7, 0], palette.wallInner, { colliders });
  addBox(scene, [15.6, 3.4, 0.5], [0, 1.7, -5.5], palette.wallInner, { colliders });
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x1a1620, 0.6));
  const dir = new THREE.DirectionalLight(0xfff1d6, 0.5);
  dir.position.set(-6, 10, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -9;
  dir.shadow.camera.right = 9;
  dir.shadow.camera.top = 9;
  dir.shadow.camera.bottom = -9;
  scene.add(dir);

  for (const ex of EXHIBITS) {
    // plinth
    addBox(scene, [0.9, 1.0, 0.9], [ex.x, 0.5, -1.4], palette.stone, { colliders });
    addBox(scene, [1.05, 0.1, 1.05], [ex.x, 1.05, -1.4], palette.stoneDark);
    // the object: a small glowing shape you can see from across the hall
    const object = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mat(ex.color, { rough: 0.35, emissive: ex.color }));
    object.position.set(ex.x, 1.5, -1.4);
    object.castShadow = true;
    scene.add(object);
    const light = new THREE.PointLight(ex.color, 5, 7, 1.6);
    light.position.set(ex.x, 2.1, -1.2);
    scene.add(light);
    const label = dynamicLabel(scene, [ex.x, 2.35, -1.3], 0.6);
    label.set(ex.name);
    interactables.push({
      object: anchor(scene, ex.x, -0.5),
      range: 2.0,
      label: () => `Use ${ex.name}`,
      act: () => ctx.openExposition(ex.id),
    });
  }

  interactables.push({
    object: anchor(scene, 0, 4.6),
    label: () => 'Return to the clearing',
    act: () => ctx.transition('hub.fromHistory'),
  });

  ctx.player.teleport(0, 3.8, Math.PI);
  ctx.caption('Four things to touch. Each one answers a question — the last one is the one that matters.');

  return {
    id: 'history',
    scene,
    colliders,
    bounds,
    interactables,
    cam: { pos: [0, 11.5, 9.8], look: [0, 1.8, -1.7], fit: 6.8 },
    debug: () => ({ exhibits: EXHIBITS.map((e) => e.id) }),
    update() {},
    dispose() {},
  };
}

function anchor(scene: THREE.Scene, x: number, z: number, y = 1.1): THREE.Object3D {
  const a = new THREE.Object3D();
  a.position.set(x, y, z);
  scene.add(a);
  return a;
}
