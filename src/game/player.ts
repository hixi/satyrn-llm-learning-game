import * as THREE from 'three';
import { Box2, moveWithCollisions } from '../engine/collisions';

export interface HeldToken {
  id: string;
  name: string;
  object: THREE.Object3D;
}

export interface MoveWorld {
  colliders: Box2[];
  bounds: Box2;
}

export class PlayerAvatar {
  object = new THREE.Group();
  pos = new THREE.Vector3(0, 0, 8);
  radius = 0.35;
  speed = 3.4;
  held: HeldToken | null = null;

  private yaw = Math.PI;
  private hand = new THREE.Object3D();
  private xrayOn = false;
  private xrayMeshes = new Set<THREE.Mesh>();

  constructor() {
    const cloak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.32, 0.66, 7),
      new THREE.MeshStandardMaterial({ color: 0x4f7d77, flatShading: true, roughness: 0.95 }),
    );
    cloak.position.y = 0.45;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9b48f, flatShading: true, roughness: 0.9 }),
    );
    head.position.y = 0.95;
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.2, 7),
      new THREE.MeshStandardMaterial({ color: 0xb5651d, flatShading: true, roughness: 0.9 }),
    );
    hat.position.y = 1.12;
    for (const m of [cloak, head, hat]) {
      m.castShadow = true;
      this.object.add(m);
    }
    this.hand.position.set(0.36, 0.88, 0.34);
    this.object.add(this.hand);
  }

  teleport(x: number, z: number, facingYaw = Math.PI): void {
    this.pos.set(x, 0, z);
    this.yaw = facingYaw;
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.yaw;
  }

  update(dt: number, vx: number, vz: number, world: MoveWorld | null): void {
    if (world && (vx !== 0 || vz !== 0)) {
      moveWithCollisions(this.pos, vx * dt, vz * dt, this.radius, world.colliders, world.bounds);
      const desired = Math.atan2(vx, vz);
      let d = desired - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.yaw;
    if (this.held) this.held.object.rotation.y += dt * 0.9;
  }

  attach(token: HeldToken): void {
    this.held = token;
    token.object.position.set(0, 0, 0);
    token.object.rotation.set(0, 0, 0);
    this.hand.add(token.object);
  }

  detach(): HeldToken | null {
    const token = this.held;
    if (token) this.hand.remove(token.object);
    this.held = null;
    return token;
  }

  /**
   * X-ray mode: while scenery covers the character, draw him over it so the
   * player can always tell where he is. Restores exactly the meshes touched.
   */
  setXray(on: boolean): void {
    if (on) {
      this.object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || mesh.userData.shared) return; // never mutate shared glTF materials
        const material = mesh.material as THREE.Material;
        material.depthTest = false;
        material.transparent = true;
        material.opacity = 1;
        mesh.renderOrder = 999;
        this.xrayMeshes.add(mesh);
      });
    } else if (this.xrayOn) {
      for (const mesh of this.xrayMeshes) {
        const material = mesh.material as THREE.Material;
        material.depthTest = true;
        material.transparent = false;
        mesh.renderOrder = 0;
      }
      this.xrayMeshes.clear();
    }
    this.xrayOn = on;
  }
}
