import * as THREE from 'three';
import { dynamicLabel, makeLabel, mat, palette } from '../../engine/sceneKit';
import { NOTE_NAMES, WORDS } from './model';
import type { MusicModel } from './model';
import { MlpModel } from './mlp';

export type LabelMode = 0 | 1 | 2;
export type PanelKind = 'counter' | 'network';

const rowY = (i: number) => 0.6 + i * 0.46;
const IN_X = -2.6;
const HID_X = 0;
const OUT_X = 2.6;
const BAR_X = 3.5;
const LBL_X = 3.85;
const GOLD = 0xd9a441;
const BLUE = 0x5a7fd4;

/**
 * The model drawn plainly. Both model kinds share it: a counter shows
 * input → output weights; a trained network shows input → hidden → output,
 * with edge colour for sign and thickness for magnitude.
 */
export class NetPanel {
  readonly group = new THREE.Group();
  private inputMat: THREE.MeshStandardMaterial[] = [];
  private outputMat: THREE.MeshStandardMaterial[] = [];
  private hiddenMat: THREE.MeshStandardMaterial[] = [];
  private hiddenNodes: THREE.Mesh[] = [];
  private ioMesh: THREE.Mesh[] = [];
  private ioMat: THREE.MeshStandardMaterial[] = [];
  private ihMesh: THREE.Mesh[] = [];
  private ihMat: THREE.MeshStandardMaterial[] = [];
  private hoMesh: THREE.Mesh[] = [];
  private hoMat: THREE.MeshStandardMaterial[] = [];
  private bars: THREE.Mesh[] = [];
  private barMat: THREE.MeshStandardMaterial[] = [];
  private outLabels: { set(t: string): void; dispose(): void }[] = [];
  private activeInput = -1;
  private litInputs: number[] = [];
  private flash = -1;
  private labelMode: LabelMode = 0;
  private kind: PanelKind = 'counter';

  constructor(scene: THREE.Scene, cx = 0.4) {
    this.group.position.set(cx, 0, 0);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.4, 0.25), mat(0x222a40, { rough: 0.85 }));
    slab.position.set(0, 2.2, -0.2);
    this.group.add(slab);

    const heads: [string, number][] = [
      ['what it heard', IN_X],
      ['how it mixes', HID_X],
      ['what it expects', OUT_X + 0.5],
    ];
    this.headHidden = makeLabel(heads[1][0], 0.5);
    this.headHidden.position.set(heads[1][1], 4.15, 0);
    this.headHidden.visible = false;
    this.group.add(this.headHidden);
    for (const [text, x] of [heads[0], heads[2]] as [string, number][]) {
      const l = makeLabel(text, 0.5);
      l.position.set(x, 4.15, 0);
      this.group.add(l);
    }

    const nodeGeo = new THREE.SphereGeometry(0.22, 12, 9);
    for (let i = 0; i < 8; i++) {
      const im = mat(palette.gold, { rough: 0.4, emissive: 0x6a4a10 });
      const inNode = new THREE.Mesh(nodeGeo, im);
      inNode.position.set(IN_X, rowY(i), 0);
      this.group.add(inNode);
      this.inputMat.push(im);

      const om = mat(palette.lens, { rough: 0.4, emissive: 0x123238 });
      const outNode = new THREE.Mesh(nodeGeo, om);
      outNode.position.set(OUT_X, rowY(i), 0);
      this.group.add(outNode);
      this.outputMat.push(om);

      const hm = mat(0x9a8fd4, { rough: 0.4, emissive: 0x2a2450 });
      const hidNode = new THREE.Mesh(nodeGeo, hm);
      hidNode.position.set(HID_X, rowY(i), 0);
      hidNode.visible = false;
      this.group.add(hidNode);
      this.hiddenNodes.push(hidNode);
      this.hiddenMat.push(hm);
    }

    const edgeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 5);
    edgeGeo.rotateZ(-Math.PI / 2);
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const xAxis = new THREE.Vector3(1, 0, 0);
    const edge = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } => {
      from.set(ax, ay, az);
      to.set(bx, by, bz);
      dir.copy(to).sub(from);
      const len = dir.length();
      const m = new THREE.MeshStandardMaterial({
        color: GOLD,
        emissive: 0x2a2008,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        roughness: 0.6,
      });
      const mesh = new THREE.Mesh(edgeGeo, m);
      mesh.position.copy(from).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(xAxis, dir.clone().normalize());
      mesh.scale.x = len;
      this.group.add(mesh);
      return { mesh, material: m };
    };

    for (let i = 0; i < 8; i++) {
      for (let o = 0; o < 8; o++) {
        const e = edge(IN_X, rowY(i), 0, OUT_X, rowY(o), 0);
        this.ioMesh.push(e.mesh);
        this.ioMat.push(e.material);
      }
      for (let h = 0; h < 8; h++) {
        const e = edge(IN_X, rowY(i), 0, HID_X, rowY(h), 0);
        e.mesh.visible = false;
        this.ihMesh.push(e.mesh);
        this.ihMat.push(e.material);
      }
    }
    for (let h = 0; h < 8; h++) {
      for (let o = 0; o < 8; o++) {
        const e = edge(HID_X, rowY(h), 0, OUT_X, rowY(o), 0);
        e.mesh.visible = false;
        this.hoMesh.push(e.mesh);
        this.hoMat.push(e.material);
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

  private headHidden: THREE.Sprite;

  setKind(kind: PanelKind): void {
    this.kind = kind;
    const isNet = kind === 'network';
    this.headHidden.visible = isNet;
    for (const n of this.hiddenNodes) n.visible = isNet;
    for (const m of this.ioMesh) m.visible = !isNet;
    for (const m of this.ihMesh) m.visible = isNet;
    for (const m of this.hoMesh) m.visible = isNet;
  }

  get panelKind(): PanelKind {
    return this.kind;
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

  private paintBars(p: number[], flash: number | null): void {
    for (let k = 0; k < 8; k++) {
      const h = Math.max(0.02, p[k] * 0.52);
      this.bars[k].scale.y = h;
      this.bars[k].position.y = rowY(k) - 0.16 + h / 2;
      const isFlash = k === flash;
      this.outputMat[k].emissiveIntensity = isFlash ? 2.6 : 0.6 + p[k] * 1.6;
      this.barMat[k].emissive.setHex(isFlash ? GOLD : 0x1c4a55);
    }
  }

  /** Counter view: weight from the heard note to each expected note. */
  show(p: number[], activeInput: number | null, flash: number | null): void {
    this.activeInput = activeInput ?? -1;
    this.litInputs = activeInput === null ? [] : [activeInput];
    this.flash = flash ?? -1;
    for (let j = 0; j < 8; j++) {
      this.inputMat[j].emissiveIntensity = j === this.activeInput ? 2.4 : 0.5;
    }
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 8; k++) {
        this.ioMat[j * 8 + k].opacity = j === this.activeInput ? 0.06 + p[k] * 0.85 : 0.03;
      }
    }
    this.paintBars(p, flash ?? null);
  }

  /** Network view: real weights, real activations. */
  showNetwork(
    context: number[],
    hidden: number[],
    p: number[],
    w1: Float64Array,
    w2: Float64Array,
    flash: number | null,
  ): void {
    const inSize = 8 * 2;
    const lit = new Set(context.slice(-2));
    this.litInputs = [...lit];
    this.activeInput = -1;
    this.flash = flash ?? -1;

    for (let i = 0; i < 8; i++) {
      const on = lit.has(i);
      this.inputMat[i].emissiveIntensity = on ? 2.3 : 0.4;
    }
    for (let h = 0; h < 8; h++) {
      const a = Math.min(1, Math.abs(hidden[h] ?? 0));
      this.hiddenMat[h].emissiveIntensity = 0.3 + a * 2.3;
    }

    let max1 = 1e-6;
    let max2 = 1e-6;
    for (let i = 0; i < 8; i++) {
      for (let h = 0; h < 8; h++) {
        max1 = Math.max(max1, Math.abs(w1[h * inSize + i]));
      }
    }
    for (let h = 0; h < 8; h++) {
      for (let o = 0; o < 8; o++) {
        max2 = Math.max(max2, Math.abs(w2[o * 8 + h]));
      }
    }
    for (let i = 0; i < 8; i++) {
      for (let h = 0; h < 8; h++) {
        const w = w1[h * inSize + i];
        const m = this.ihMat[i * 8 + h];
        m.opacity = 0.02 + 0.8 * (Math.abs(w) / max1);
        m.color.setHex(w >= 0 ? GOLD : BLUE);
      }
    }
    for (let h = 0; h < 8; h++) {
      for (let o = 0; o < 8; o++) {
        const w = w2[o * 8 + h];
        const m = this.hoMat[h * 8 + o];
        m.opacity = 0.02 + 0.8 * (Math.abs(w) / max2);
        m.color.setHex(w >= 0 ? GOLD : BLUE);
      }
    }
    this.paintBars(p, flash);
  }

  update(_dt: number, t: number): void {
    for (const i of this.litInputs) {
      this.inputMat[i].emissiveIntensity = 2.3 + Math.sin(t * 7) * 0.5;
    }
    if (this.flash >= 0) {
      this.outputMat[this.flash].emissiveIntensity = 2.5 + Math.sin(t * 9) * 0.6;
    }
  }

  dispose(): void {
    for (const l of this.outLabels) l.dispose();
  }
}

/** Draw whichever kind of model is loaded, at the given context. */
export function presentModel(
  net: NetPanel,
  model: MusicModel,
  context: number[],
  temperature: number,
  flash: number | null,
): void {
  net.setKind(model.kind);
  if (model instanceof MlpModel) {
    const f = model.forward(context);
    const w = model.weights();
    net.showNetwork(context, Array.from(f.hidden), model.distribution(context, temperature), w.w1, w.w2, flash);
  } else {
    const last = context[context.length - 1] ?? null;
    net.show(model.distribution(context, temperature), last, flash);
  }
}
