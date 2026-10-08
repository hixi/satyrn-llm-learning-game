import * as THREE from 'three';
import type { Box2 } from '../engine/collisions';
import type { AssetStore } from '../engine/assets';
import type { AudioKit } from '../engine/audio';
import type { InputManager } from '../engine/input';
import type { PlayerAvatar } from './player';
import type { GameState } from './save';

export interface Interactable {
  object: THREE.Object3D;
  range?: number;
  label(): string | null;
  act(): void;
}

export interface World {
  id: string;
  scene: THREE.Scene;
  colliders: Box2[];
  bounds: Box2;
  interactables: Interactable[];
  /** Fixed diorama camera: when present, the rig parks here instead of following the player. */
  cam?: { pos: [number, number, number]; look: [number, number, number]; fit?: number };
  /** Live state for headless tests and debugging overlays. */
  debug?(): Record<string, unknown>;
  update(dt: number, t: number): void;
  dispose(): void;
}

export interface WorldContext {
  player: PlayerAvatar;
  state: GameState;
  assets: AssetStore;
  audio: AudioKit;
  input: InputManager;
  transition(route: string): void;
  toast(text: string): void;
  caption(text: string | null): void;
}

export type WorldFactory = (ctx: WorldContext, spawnKey: string) => World;

export function interactableAt(it: Interactable): THREE.Vector3 {
  return it.object.getWorldPosition(new THREE.Vector3());
}
