import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetStore {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<THREE.Group>>();

  get(url: string): Promise<THREE.Group> {
    let p = this.cache.get(url);
    if (!p) {
      p = this.load(url);
      this.cache.set(url, p);
    }
    return p;
  }

  private load(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((o) => {
            o.userData.shared = true;
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              const material = mesh.material as THREE.MeshStandardMaterial;
              material.flatShading = true;
              material.needsUpdate = true;
            }
          });
          resolve(gltf.scene);
        },
        undefined,
        (err) => reject(err),
      );
    });
  }

  clone(template: THREE.Group): THREE.Group {
    const c = template.clone(true);
    c.traverse((o) => {
      o.userData.shared = true;
    });
    return c;
  }
}
