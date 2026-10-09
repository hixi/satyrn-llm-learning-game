import * as THREE from 'three';
import { Box2 } from '../engine/collisions';
import { addBox, addGround, addLights, makeLabel, mat, palette } from '../engine/sceneKit';
import { Interactable, World, WorldContext } from '../game/world';
import { addBuilding } from './buildingKit';

export function createHub(ctx: WorldContext, spawnKey: string): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.sky, 32, 85);

  const colliders: Box2[] = [];
  const bounds: Box2 = { minX: -21, maxX: 21, minZ: -21, maxZ: 21 };
  const interactables: Interactable[] = [];

  addGround(scene, 44, 44, palette.grass);
  addLights(scene);

  // a path north from the clearing, with arms to the two halls
  addBox(scene, [2.2, 0.06, 12], [0, 0.03, 0.4], palette.path);
  addBox(scene, [2.2, 0.06, 6.0], [0, 0.03, 6.6], palette.path);
  addBox(scene, [9.5, 0.06, 1.7], [-4.7, 0.03, -1.8], palette.path);
  addBox(scene, [9.5, 0.06, 1.7], [4.7, 0.03, -1.8], palette.path);

  addBuilding(scene, colliders, interactables, ctx, {
    x: -14,
    z: -2,
    rotY: Math.PI / 2,
    name: 'The Training Hall',
    doorLabel: 'Enter the Training Hall',
    route: 'training.door',
    onEnter: (route) => ctx.transition(route),
  });
  addBuilding(scene, colliders, interactables, ctx, {
    x: 14,
    z: -2,
    rotY: -Math.PI / 2,
    roofColor: 0x33405e,
    name: 'The Echo Hall',
    doorLabel: 'Enter the Echo Hall',
    route: 'echo.door',
    onEnter: (route) => ctx.transition(route),
  });
  addBuilding(scene, colliders, interactables, ctx, {
    x: 0,
    z: 15,
    rotY: Math.PI,
    roofColor: 0x6a5a3a,
    name: 'The Hall of History',
    doorLabel: 'Enter the Hall of History',
    route: 'history.door',
    onEnter: (route) => ctx.transition(route),
  });

  addBox(scene, [0.14, 2.4, 0.14], [2.4, 1.2, 2.4], palette.woodDark, { colliders });
  const lampHead = addBox(scene, [0.4, 0.5, 0.4], [2.4, 2.55, 2.4], palette.gold, {
    matOpts: { emissive: 0xffb347, rough: 0.4 },
  });
  const lampLight = new THREE.PointLight(0xffc87a, 12, 15, 1.6);
  lampLight.position.set(2.4, 2.55, 2.4);
  scene.add(lampLight);

  addBox(scene, [0.16, 1.9, 0.16], [-3.8, 0.95, 2.4], palette.woodDark, { colliders });
  addBox(scene, [1.1, 0.5, 0.1], [-3.5, 1.75, 2.4], palette.wood);
  const sign = makeLabel('Wayfarer’s Clearing · two halls', 0.8);
  sign.position.set(-3.5, 2.35, 2.4);
  scene.add(sign);

  const stoneGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.1, 7);
  for (const [sx, sz] of [
    [-6.2, 5.4],
    [6.4, 5.2],
    [-5.6, -7.2],
    [5.8, -7.4],
  ] as const) {
    const stone = new THREE.Mesh(stoneGeo, mat(palette.stone));
    stone.position.set(sx, 0.55, sz);
    stone.rotation.y = (sx * 7 + sz * 13) % Math.PI;
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
  }

  switch (spawnKey) {
    case 'fromTraining':
      ctx.player.teleport(-7.2, -2, Math.PI / 2);
      break;
    case 'fromEcho':
      ctx.player.teleport(7.2, -2, -Math.PI / 2);
      break;
    case 'fromHistory':
      ctx.player.teleport(0, 9.6, Math.PI);
      break;
    default:
      ctx.player.teleport(0, 6.5, Math.PI);
  }

  return {
    id: 'hub',
    scene,
    colliders,
    bounds,
    interactables,
    update(_dt, t) {
      lampLight.intensity = 11 + Math.sin(t * 5.3) * 1.6 + Math.sin(t * 11.7) * 0.9;
      lampHead.rotation.y = t * 0.4;
    },
    dispose() {},
  };
}
