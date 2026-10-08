import * as THREE from 'three';

export interface Box2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function boxFromMesh(mesh: THREE.Mesh, pad = 0): Box2 {
  const bb = new THREE.Box3().setFromObject(mesh);
  return {
    minX: bb.min.x - pad,
    maxX: bb.max.x + pad,
    minZ: bb.min.z - pad,
    maxZ: bb.max.z + pad,
  };
}

/** How far the circle overlaps the box: > 0 inside, <= 0 clear. */
function overlapDepth(px: number, pz: number, r: number, b: Box2): number {
  const cx = Math.max(b.minX, Math.min(px, b.maxX));
  const cz = Math.max(b.minZ, Math.min(pz, b.maxZ));
  const dx = px - cx;
  const dz = pz - cz;
  return r - Math.sqrt(dx * dx + dz * dz);
}

function worstOverlap(px: number, pz: number, r: number, colliders: Box2[]): number {
  let worst = -Infinity;
  for (const b of colliders) {
    const d = overlapDepth(px, pz, r, b);
    if (d > worst) worst = d;
  }
  return worst;
}

/**
 * Per-axis movement with sliding. A move that would push deeper into a
 * collider is refused, but movement that is neutral or reduces an existing
 * overlap is allowed — so a character who somehow starts inside geometry can
 * always walk back out instead of being stuck.
 */
export function moveWithCollisions(
  pos: THREE.Vector3,
  vx: number,
  vz: number,
  radius: number,
  colliders: Box2[],
  bounds: Box2,
): void {
  if (colliders.length === 0) {
    pos.x = Math.max(bounds.minX + radius, Math.min(pos.x + vx, bounds.maxX - radius));
    pos.z = Math.max(bounds.minZ + radius, Math.min(pos.z + vz, bounds.maxZ - radius));
    return;
  }

  const steps = 2;
  for (let i = 0; i < steps; i++) {
    const sx = vx / steps;
    const sz = vz / steps;

    const beforeX = worstOverlap(pos.x, pos.z, radius, colliders);
    pos.x += sx;
    const afterX = worstOverlap(pos.x, pos.z, radius, colliders);
    if (afterX > 0 && afterX > beforeX + 1e-3) pos.x -= sx;

    const beforeZ = worstOverlap(pos.x, pos.z, radius, colliders);
    pos.z += sz;
    const afterZ = worstOverlap(pos.x, pos.z, radius, colliders);
    if (afterZ > 0 && afterZ > beforeZ + 1e-3) pos.z -= sz;
  }

  pos.x = Math.max(bounds.minX + radius, Math.min(pos.x, bounds.maxX - radius));
  pos.z = Math.max(bounds.minZ + radius, Math.min(pos.z, bounds.maxZ - radius));
}
