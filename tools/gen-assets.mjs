import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const rings = [
  [0.2, 0.0],
  [0.185, 0.05],
  [0.15, 0.14],
  [0.12, 0.26],
  [0.105, 0.36],
  [0.1, 0.44],
  [0.075, 0.49],
];
const SEG = 12;
const CENTER = [0, 0.24, 0];

const positions = [];
const normals = [];

function pt(ring, t) {
  return [ring[0] * Math.cos(t), ring[1], ring[0] * Math.sin(t)];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(a) {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

function pushTri(a, b, c) {
  let n = cross(sub(b, a), sub(c, a));
  const cen = [(a[0] + b[0] + c[0]) / 3 - CENTER[0], (a[1] + b[1] + c[1]) / 3 - CENTER[1], (a[2] + b[2] + c[2]) / 3 - CENTER[2]];
  if (dot(n, cen) < 0) {
    [b, c] = [c, b];
    n = cross(sub(b, a), sub(c, a));
  }
  n = norm(n);
  for (const v of [a, b, c]) {
    positions.push(...v);
    normals.push(...n);
  }
}

const angle = (s) => (s / SEG) * Math.PI * 2;

for (let r = 0; r < rings.length - 1; r++) {
  for (let s = 0; s < SEG; s++) {
    const t0 = angle(s);
    const t1 = angle(s + 1);
    const p00 = pt(rings[r], t0);
    const p01 = pt(rings[r], t1);
    const p10 = pt(rings[r + 1], t0);
    const p11 = pt(rings[r + 1], t1);
    pushTri(p00, p10, p11);
    pushTri(p00, p11, p01);
  }
}

const bottomCenter = [0, rings[0][1], 0];
for (let s = 0; s < SEG; s++) {
  pushTri(bottomCenter, pt(rings[0], angle(s)), pt(rings[0], angle(s + 1)));
}

const apex = [0, rings[rings.length - 1][1] + 0.06, 0];
const lastRing = rings[rings.length - 1];
for (let s = 0; s < SEG; s++) {
  pushTri(apex, pt(lastRing, angle(s)), pt(lastRing, angle(s + 1)));
}

const vertCount = positions.length / 3;
const posArr = new Float32Array(positions);
const nrmArr = new Float32Array(normals);

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vertCount; i++) {
  for (let c = 0; c < 3; c++) {
    min[c] = Math.min(min[c], posArr[i * 3 + c]);
    max[c] = Math.max(max[c], posArr[i * 3 + c]);
  }
}

const posBytes = posArr.byteLength;
const nrmBytes = nrmArr.byteLength;
const bin = new Uint8Array(posBytes + nrmBytes);
bin.set(new Uint8Array(posArr.buffer), 0);
bin.set(new Uint8Array(nrmArr.buffer), posBytes);

const gltf = {
  asset: { version: '2.0', generator: 'satyrn gen-assets' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'bell' }],
  meshes: [
    {
      name: 'bell',
      primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }],
    },
  ],
  materials: [
    {
      name: 'bronze',
      pbrMetallicRoughness: {
        baseColorFactor: [0.72, 0.5, 0.2, 1],
        metallicFactor: 0.55,
        roughnessFactor: 0.5,
      },
    },
  ],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes, byteLength: nrmBytes, target: 34962 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min, max },
    {
      bufferView: 1,
      componentType: 5126,
      count: vertCount,
      type: 'VEC3',
      min: [-1, -1, -1],
      max: [1, 1, 1],
    },
  ],
};

let jsonStr = JSON.stringify(gltf);
while (jsonStr.length % 4 !== 0) jsonStr += ' ';
const jsonBytes = new TextEncoder().encode(jsonStr);

const total = 12 + 8 + jsonBytes.length + 8 + bin.length;
const out = new ArrayBuffer(total);
const view = new DataView(out);
view.setUint32(0, 0x46546c67, true);
view.setUint32(4, 2, true);
view.setUint32(8, total, true);
view.setUint32(12, jsonBytes.length, true);
view.setUint32(16, 0x4e4f534a, true);
new Uint8Array(out).set(jsonBytes, 20);
view.setUint32(20 + jsonBytes.length, bin.length, true);
view.setUint32(24 + jsonBytes.length, 0x004e4942, true);
new Uint8Array(out).set(bin, 28 + jsonBytes.length);

const dir = join(root, 'public', 'assets', 'props');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'bell.glb'), Buffer.from(out));
console.log(`bell.glb: ${vertCount} verts, ${total} bytes -> public/assets/props/`);
