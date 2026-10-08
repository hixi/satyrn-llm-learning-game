import * as THREE from 'three';

interface GhostState {
  t: number;
  baseOpacity: number;
  baseTransparent: boolean;
  baseDepthWrite: boolean;
}

/**
 * Keeps the character readable behind scenery without moving the camera:
 * every frame, meshes on the segment from the character to the camera fade
 * to a ghost state, then fade back once they no longer cover him.
 */
export class OccluderFader {
  private raycaster = new THREE.Raycaster();
  private state = new Map<THREE.Mesh, GhostState>();
  private seen = new Set<THREE.Mesh>();

  constructor(private ignored: THREE.Object3D[] = []) {}

  get activeCount(): number {
    let n = 0;
    for (const [, s] of this.state) if (s.t > 0.02) n++;
    return n;
  }

  update(dt: number, camera: THREE.PerspectiveCamera, focus: THREE.Vector3, scene: THREE.Scene): void {
    const target = new THREE.Vector3(focus.x, focus.y + 1.0, focus.z);
    const dir = camera.position.clone().sub(target);
    const dist = dir.length();
    if (dist < 0.01) return;
    dir.divideScalar(dist);
    this.raycaster.set(target, dir);
    this.raycaster.far = dist;

    this.seen.clear();
    for (const hit of this.raycaster.intersectObjects(scene.children, true)) {
      if (this.isIgnored(hit.object)) continue;
      const mesh = hit.object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material || mesh.userData.shared) continue;
      const material = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material) || !('opacity' in material)) continue;
      this.seen.add(mesh);
    }

    for (const mesh of this.seen) {
      let ghost = this.state.get(mesh);
      if (!ghost) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        ghost = {
          t: 0,
          baseOpacity: material.opacity,
          baseTransparent: material.transparent,
          baseDepthWrite: material.depthWrite,
        };
        this.state.set(mesh, ghost);
      }
      ghost.t = Math.min(1, ghost.t + dt * 7);
      this.apply(mesh, ghost);
    }

    for (const [mesh, ghost] of [...this.state]) {
      if (this.seen.has(mesh)) continue;
      ghost.t -= dt * 5;
      if (ghost.t <= 0) {
        this.restore(mesh, ghost);
        this.state.delete(mesh);
      } else {
        this.apply(mesh, ghost);
      }
    }
  }

  private apply(mesh: THREE.Mesh, ghost: GhostState): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = ghost.baseOpacity * (1 - ghost.t * 0.88);
  }

  private restore(mesh: THREE.Mesh, ghost: GhostState): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.opacity = ghost.baseOpacity;
    material.transparent = ghost.baseTransparent;
    material.depthWrite = ghost.baseDepthWrite;
    material.needsUpdate = true;
  }

  private isIgnored(o: THREE.Object3D): boolean {
    let n: THREE.Object3D | null = o;
    while (n) {
      if (this.ignored.includes(n)) return true;
      n = n.parent;
    }
    return false;
  }
}
