import * as THREE from 'three';
import { disposeScene } from '../engine/sceneKit';
import { PlayerAvatar } from './player';
import { World, WorldContext, WorldFactory } from './world';

export interface SceneManagerDeps {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  transitionFx(swap: () => void): Promise<void>;
}

export class SceneManager {
  world: World | null = null;
  private scene: THREE.Scene | null = null;
  private registry = new Map<string, WorldFactory>();
  private currentRoute = '';
  private busy = false;

  constructor(
    private ctx: WorldContext,
    private player: PlayerAvatar,
    private deps: SceneManagerDeps,
  ) {}

  register(id: string, factory: WorldFactory): void {
    this.registry.set(id, factory);
  }

  navigate(route: string): void {
    if (route === this.currentRoute) return;
    location.hash = '#' + route;
  }

  async loadFromHash(): Promise<void> {
    const route = location.hash.slice(1) || 'hub';
    await this.load(route);
  }

  private async load(route: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const [id, spawnKey = 'default'] = route.split('.');
    const factory = this.registry.get(id);
    try {
      if (factory) {
        await this.deps.transitionFx(() => {
          this.ctx.caption(null);
          if (this.world) {
            this.player.detach(); // carried tokens belong to their world, not to the wayfarer
            this.world.dispose();
            disposeScene(this.world.scene);
          }
          const w = factory(this.ctx, spawnKey);
          this.world = w;
          this.scene = w.scene;
          this.scene.add(this.player.object);
          this.currentRoute = route;
        });
      } else {
        this.busy = false;
        this.navigate('hub');
        return;
      }
    } finally {
      this.busy = false;
    }
  }

  update(dt: number, t: number): void {
    this.world?.update(dt, t);
  }

  render(): void {
    if (this.scene) this.deps.renderer.render(this.scene, this.deps.camera);
  }
}
