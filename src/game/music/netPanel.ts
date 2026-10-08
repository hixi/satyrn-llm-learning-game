import * as THREE from 'three';
import { dynamicLabel, makeLabel, mat, palette } from '../../engine/sceneKit';
import { NOTE_NAMES, WORDS } from './model';

export type LabelMode = 0 | 1 | 2;

const rowY = (i: number) => 0.6 + i * 0.46;
const IN_X = -2.5;
const OUT_X = 2.5;
const BAR_X = 3.4;
const LBL_X = 3.72;

/**
 * The model drawn as a two-column network: input notes on the left, expected
 * notes on the right, weighted edges between them and a probability bar per
 * output. Shared by the training hall and the echo hall.
 */
export class NetPanel {
  readonly group = new THREE.Group();
  private inputMat: THREE.MeshStandardMaterial[] = [];
  private outputMat: THREE.MeshStandardMaterial[] = [];
  private edgeMat: THREE.MeshStandardMaterial[] = [];
  private bars: THREE.Mesh[] = [];
  private barMat: THREE.MeshStandardMaterial[] = [];
  private outLabels: { set(t: string): void; dispose(): void }[] = [];
  private activeInput = -1;
  private flash = -1;
  private labelMode: LabelMode = 0;

  constructor(scene: THREE.Scene, cx = 0.4) {
    this.group.position.set(cx, 0, 0);

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 4.4, 0.25),
      mat(0x222a40, { rough: 0.85 }),
    );
    slab.position.set(0, 2.2, -0.2);
    this.group.add(slab);

    const headIn = makeLabel('what it heard', 0.5);
    headIn.position.set(IN_X, 4.15, 0);
    this.group.add(headIn);
    const headOut = makeLabel('what it expects', 0.5);
    headOut.position.set(OUT_X + 0.5, 4.15, 0);
    this.group.add(headOut);

    const nodeGeo = new THREE.SphereGeometry(0.24, 12, 9);
    const inputNodes: THREE.Mesh[] = [];
    const outputNodes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const im = mat(palette.gold, { rough: 0.4, emissive: 0x6a4a10 });
      const om = mat(palette.lens, { rough: 0.4, emissive: 0x123238 });
      const inNode = new THREE.Mesh(nodeGeo, im);
      inNode.position.set(IN_X, rowY(i), 0);
      this.group.add(inNode);
      inputNodes.push(inNode);
      this.inputMat.push(im);
      const outNode = new THREE.Mesh(nodeGeo, om);
      outNode.position.set(OUT_X, rowY(i), 0);
      this.group.add(outNode);
      outputNodes.push(outNode);
      this.outputMat.push(om);
    }

    const edgeGeo = new THREE.CylinderGeometry(0.036, 0.036, 1, 5);
    edgeGeo.rotateZ(-Math.PI / 2);
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const xAxis = new THREE.Vector3(1, 0, 0);
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 8; k++) {
        from.set(IN_X, rowY(j), 0);
        to.set(OUT_X, rowY(k), 0);
        dir.copy(to).sub(from);
        const len = dir.length();
        const m = new THREE.MeshStandardMaterial({
          color: palette.gold,
          emissive: 0x3a2a08,
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          roughness: 0.6,
        });
        const edge = new THREE.Mesh(edgeGeo, m);
        edge.position.copy(from).addScaledVector(dir, 0.5);
        edge.quaternion.setFromUnitVectors(xAxis, dir.clone().normalize());
        edge.scale.x = len;
        this.group.add(edge);
        this.edgeMat.push(m);
      }
    }

    const barGeo = new THREE.BoxGeometry(0.2, 1, 0.2);
    for (let i = 0; i < 8; i++) {
      const bm = mat(palette.lens, { rough: 0.35, emissive: 0x1c4a55 });
      const bar = new THREE.Mesh(barGeo, bm);
      bar.position.set(BAR_X, rowY(i) - 0.16, 0);
      bar.scale.y = 0.02;
      this.group.add(bar);
      this.bars.push(bar);
      this.barMat.push(bm);
    }

    for (let i = 0; i < 8; i++) {
      this.outLabels.push(dynamicLabel(this.group, [LBL_X, rowY(i), 0], 0.5));
    }
    this.setLabelMode(0);
    scene.add(this.group);
  }

  setLabelMode(mode: LabelMode): void {
    this.labelMode = mode;
    for (let i = 0; i < 8; i++) this.outLabels[i].set(this.labelFor(i));
  }

  private labelFor(degree: number): string {
    if (this.labelMode === 1) return WORDS[degree];
    if (this.labelMode === 2) return `${NOTE_NAMES[degree]} ${WORDS[degree]}`;
    return NOTE_NAMES[degree];
  }

  show(p: number[], activeInput: number | null, flash: number | null): void {
    this.activeInput = activeInput ?? -1;
    this.flash = flash ?? -1;
    for (let j = 0; j < 8; j++) {
      this.inputMat[j].emissiveIntensity = j === this.activeInput ? 2.4 : 0.5;
    }
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 8; k++) {
        this.edgeMat[j * 8 + k].opacity = j === this.activeInput ? 0.06 + p[k] * 0.85 : 0.03;
      }
    }
    for (let k = 0; k < 8; k++) {
      const h = Math.max(0.02, p[k] * 0.52);
      this.bars[k].scale.y = h;
      this.bars[k].position.y = rowY(k) - 0.16 + h / 2;
      const isFlash = k === this.flash;
      this.outputMat[k].emissiveIntensity = isFlash ? 2.6 : 0.6 + p[k] * 1.6;
      this.barMat[k].emissive.setHex(isFlash ? 0xd9a441 : 0x1c4a55);
    }
  }

  update(_dt: number, t: number): void {
    if (this.activeInput >= 0) {
      this.inputMat[this.activeInput].emissiveIntensity = 2.3 + Math.sin(t * 7) * 0.5;
    }
    if (this.flash >= 0) {
      this.outputMat[this.flash].emissiveIntensity = 2.5 + Math.sin(t * 9) * 0.6;
    }
  }

  dispose(): void {
    for (const l of this.outLabels) l.dispose();
  }
}
