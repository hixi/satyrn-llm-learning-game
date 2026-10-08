import * as THREE from 'three';
import { Box2, boxFromMesh } from '../engine/collisions';
import { makeLabel, mat, palette } from '../engine/sceneKit';
import type { Interactable, WorldContext } from '../game/world';

const WALL_H = 3.4;
const TH = 0.5;
const HW = 6.5;
const HD = 5;

export interface BuildingSpec {
  x: number;
  z: number;
  rotY?: number;
  doorHalf?: number;
  roofColor?: number;
  name: string;
  doorLabel: string;
  route: string;
  onEnter: (route: string) => void;
}

/**
 * Exterior shell for an enterable world: four walls with a front opening,
 * roof, lit threshold and a door interactable. Rotatable; colliders are
 * exact AABBs because only 90° steps are allowed.
 */
export function addBuilding(
  scene: THREE.Scene,
  colliders: Box2[],
  interactables: Interactable[],
  ctx: WorldContext,
  spec: BuildingSpec,
): void {
  const g = new THREE.Group();
  g.position.set(spec.x, 0, spec.z);
  if (spec.rotY) g.rotation.y = spec.rotY;

  const dh = spec.doorHalf ?? 1.1;
  const seg = HW - dh;
  const solid: THREE.Mesh[] = [];

  const mk = (size: [number, number, number], pos: [number, number, number], color: number, visible = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat(color));
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = visible;
    g.add(mesh);
    return mesh;
  };
  const wall = (size: [number, number, number], pos: [number, number, number]): THREE.Mesh => {
    const m = mk(size, pos, palette.wall);
    solid.push(m);
    return m;
  };

  wall([seg, WALL_H, TH], [-HW + seg / 2, WALL_H / 2, HD]);
  wall([seg, WALL_H, TH], [HW - seg / 2, WALL_H / 2, HD]);
  wall([seg, WALL_H, TH], [-HW + seg / 2, WALL_H / 2, -HD]);
  wall([seg, WALL_H, TH], [HW - seg / 2, WALL_H / 2, -HD]);
  wall([TH, WALL_H, HD * 2], [-HW, WALL_H / 2, 0]);
  wall([TH, WALL_H, HD * 2], [HW, WALL_H / 2, 0]);

  // threshold, lintel and roof are decoration only
  mk([dh * 2, 2.9, 0.1], [0, 1.45, HD - 0.1], 0x17131d);
  mk([dh * 2, 0.5, TH + 0.04], [0, WALL_H - 0.25, HD], palette.woodDark);
  mk([HW * 2 + 0.8, 0.35, HD * 2 + 0.8], [0, WALL_H + 0.175, 0], spec.roofColor ?? palette.roof);

  const name = makeLabel(spec.name, 0.8);
  name.position.set(0, WALL_H + 1.0, HD + 0.2);
  g.add(name);

  const anchor = new THREE.Object3D();
  anchor.position.set(0, 1, HD + 0.9);
  g.add(anchor);

  scene.add(g);
  scene.updateMatrixWorld(true);
  for (const m of solid) colliders.push(boxFromMesh(m));

  interactables.push({
    object: anchor,
    range: 2.1,
    label: () => spec.doorLabel,
    act: () => spec.onEnter(spec.route),
  });
}
