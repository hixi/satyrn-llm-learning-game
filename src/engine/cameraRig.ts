import * as THREE from 'three';

/**
 * Steady 2.5D camera: follow mode keeps a constant offset from the player
 * (no zoom, no occlusion pull-ins); interiors use fixed diorama positions.
 */
export class CameraRig {
  yaw = 0;
  private yawTarget = 0;
  distance = 15;
  private heightFactor = 0.8;

  constructor(private camera: THREE.PerspectiveCamera) {}

  snap(quarter: -1 | 1): void {
    this.yawTarget += (quarter * Math.PI) / 2;
  }

  moveToWorldVector(x: number, y: number): THREE.Vector2 {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz = fx;
    const fy = -y;
    return new THREE.Vector2(x * rx + fy * fx, x * rz + fy * fz);
  }

  update(dt: number, focus: THREE.Vector3, fixed?: { pos: [number, number, number]; look: [number, number, number]; fit?: number } | null): void {
    const k = 1 - Math.exp(-dt * 7);
    this.yaw += (this.yawTarget - this.yaw) * k;

    let look: THREE.Vector3;
    if (fixed) {
      const lookV = new THREE.Vector3(fixed.look[0], fixed.look[1], fixed.look[2]);
      const base = new THREE.Vector3(fixed.pos[0], fixed.pos[1], fixed.pos[2]);
      const offset = base.clone().sub(lookV);
      const len = offset.length();
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * len * this.camera.aspect;
      const scale = Math.max(1, (fixed.fit ?? 6.8) / halfWidth);
      this.camera.position.copy(lookV).addScaledVector(offset, scale);
      this.yaw = this.yawTarget = Math.atan2(this.camera.position.x - lookV.x, this.camera.position.z - lookV.z);
      look = lookV;
    } else {
      const dx = Math.sin(this.yaw) * this.distance;
      const dz = Math.cos(this.yaw) * this.distance;
      this.camera.position.set(focus.x + dx, focus.y + this.distance * this.heightFactor, focus.z + dz);
      look = new THREE.Vector3(focus.x, focus.y + 1.05, focus.z);
    }
    this.camera.lookAt(look);
  }
}
