import * as THREE from 'three';
import { Box2 } from '../engine/collisions';
import { addBox, dynamicLabel, mat, palette } from '../engine/sceneKit';
import { NetPanel, presentModel } from '../game/music/netPanel';
import { DEGREE_MIDI, WORDS, mulberry32 } from '../game/music/model';
import { buildModel, infoFor, listModels, select, selectedId } from '../game/music/store';
import { ECHO_HELP } from '../game/help';
import { buildAsker } from '../ui/asker';
import { timeScale } from '../game/time';
import { buildHelp } from '../ui/help';
import { Interactable, World, WorldContext } from '../game/world';

const KEEPSAKE = 'the-echo';
const BEAT = 0.42;
const GEN_NOTES = 8;
const beat = () => BEAT / timeScale();
const MAX_PROMPT = 4;
const ROOM_X = 7.5;
const ROOM_Z = 5.5;
const TEMPS = [
  { v: 0.45, name: 'cautious' },
  { v: 0.8, name: 'steady' },
  { v: 1.4, name: 'wild' },
];
const LABEL_MODES = ['notes', 'words', 'both'];

interface Step {
  ctx: number[];
  p: number[];
  note: number;
}

interface Playback {
  kind: 'recall';
  seq: number[];
  steps: Step[];
  prompt: number[];
  start: number;
  dur: number;
  step: number;
}

export function createEchoHall(ctx: WorldContext, spawnKey: string): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181d2c);

  const colliders: Box2[] = [];
  const bounds: Box2 = { minX: -ROOM_X + 0.4, maxX: ROOM_X - 0.4, minZ: -ROOM_Z + 0.5, maxZ: ROOM_Z - 0.5 };
  const interactables: Interactable[] = [];
  const player = ctx.player;

  addBox(scene, [15.6, 0.2, 11.6], [0, -0.1, 0], palette.floor);
  addBox(scene, [0.5, 3.4, 11.6], [-ROOM_X, 1.7, 0], palette.wallInner, { colliders });
  addBox(scene, [0.5, 3.4, 11.6], [ROOM_X, 1.7, 0], palette.wallInner, { colliders });
  addBox(scene, [15.6, 3.4, 0.5], [0, 1.7, -ROOM_Z], palette.wallInner, { colliders });

  scene.add(new THREE.HemisphereLight(0x8fa0cc, 0x141826, 0.7));
  const dir = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  dir.position.set(-6, 10, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -9;
  dir.shadow.camera.right = 9;
  dir.shadow.camera.top = 9;
  dir.shadow.camera.bottom = -9;
  scene.add(dir);
  const panelGlow = new THREE.PointLight(0x9ab0ff, 8, 16, 1.6);
  panelGlow.position.set(0, 2.4, -2.6);
  scene.add(panelGlow);

  const net = new NetPanel(scene);

  let selectedModelId = selectedId();
  let model = buildModel(selectedModelId);
  let askNotes: number[] = [];
  let expects: { note: number; p: number }[] = [];
  let tempIdx = 1;
  let memoryIdx = 0;
  let labelIdx = 0;
  let playback: Playback | null = null;
  let goalReached = false;
  let seedCounter = 1;
  let lastSeq: number[] = [];
  let lastPrompt: number[] = [];

  const statusBoard = dynamicLabel(scene, [0, 4.7, -3.5], 0.58);
  const promptBoard = dynamicLabel(scene, [-4.6, 2.5, 0.9], 0.58);
  const rackLabel = dynamicLabel(scene, [-6.3, 2.5, 3.2], 0.56);
  const heatLabel = dynamicLabel(scene, [-4.6, 2.5, 3.2], 0.60);
  const leverLabel = dynamicLabel(scene, [4.6, 2.5, 0.9], 0.60);
  const memLabel = dynamicLabel(scene, [4.6, 2.5, 3.2], 0.60);
  const modeLabel = dynamicLabel(scene, [6.3, 2.5, 3.2], 0.60);
  const keysLabel = dynamicLabel(scene, [-6.6, 2.5, -2.0], 0.56);

  const temperature = () => TEMPS[tempIdx].v;
  const memory = () => (memoryIdx === 0 ? 1 : 2);

  function refreshLabels(): void {
    const info = infoFor(selectedModelId);
    statusBoard.set(`Model: ${info.name} · ${model.sizeLabel()}`);
    promptBoard.set(`Prompt: ${askNotes.length ? askNotes.map((d) => WORDS[d]).join(' ') : '—'}`);
    rackLabel.set(`Model: ${info.name}`);
    heatLabel.set(`Heat: ${TEMPS[tempIdx].name}`);
    leverLabel.set(playback ? 'The echo is singing…' : 'Let it continue');
    memLabel.set(`Memory: ${memory()} note${memory() > 1 ? 's' : ''}`);
    modeLabel.set(`Labels: ${LABEL_MODES[labelIdx]}`);
    keysLabel.set(asker.isOpen() ? 'Close the keys' : 'Play a prompt');
  }

  function samplePrompt(): number[] {
    const info = infoFor(selectedModelId);
    const src = info.phrases[0] ?? [0, 2, 4];
    return src.slice(0, Math.min(2, src.length));
  }

  function renderAsker(): void {
    asker.render({ notes: askNotes, expects, busy: playback !== null });
  }

  function showExpectation(): void {
    const context = (askNotes.length ? askNotes : samplePrompt()).slice(-memory());
    expects = askNotes.length ? model.top(context, temperature(), 3) : [];
    presentModel(net, model, context, temperature(), null);
    net.setLabelMode(labelIdx as 0 | 1 | 2);
    refreshLabels();
    renderAsker();
    if (playback === null) {
      const info = infoFor(selectedModelId);
      const expectation = expects[0];
      ctx.caption(
        `Model: ${info.name} · prompt: ${askNotes.length ? askNotes.map((d) => WORDS[d]).join(' ') : '—'}${expectation ? ` · expects "${WORDS[expectation.note]}"` : ''} · play keys, then “Let it continue”`,
      );
    }
  }

  const help = buildHelp((open) => ctx.input.setSuppressed(open));

  const asker = buildAsker({
    onNote: (degree) => {
      if (playback) return;
      if (askNotes.length >= MAX_PROMPT) {
        ctx.toast('Four prompt notes is enough to show the idea.');
        return;
      }
      askNotes.push(degree);
      ctx.audio.playNote(DEGREE_MIDI[degree], 0, 0.45, 0.8);
      showExpectation();
    },
    onClear: () => {
      askNotes = [];
      showExpectation();
    },
    onSample: () => {
      if (playback) return;
      askNotes = samplePrompt();
      for (const [i, d] of askNotes.entries()) {
        ctx.audio.playNote(DEGREE_MIDI[d], ctx.audio.time() + i * 0.25, 0.4, 0.7);
      }
      ctx.toast('Borrowed the opening of what it knows — play your own to ask your own question.');
      showExpectation();
    },
    onContinue: () => continuePrompt(),
    onOpenChange: (open) => {
      ctx.input.setSuppressed(open);
      if (open) {
        renderAsker();
        showExpectation();
      }
      refreshLabels();
    },
  });

  function continuePrompt(): void {
    if (playback) return;
    if (askNotes.length === 0) {
      ctx.toast('Play a prompt first — or press Sample.');
      return;
    }
    const prompt = askNotes.slice();
    const rng = mulberry32(1000 + seedCounter++);
    const seq = prompt.slice();
    const steps: Step[] = [];
    const start = ctx.audio.time() + 0.2;
    for (let i = 0; i < GEN_NOTES; i++) {
      const c = seq.slice(-memory());
      const p = model.distribution(c, temperature());
      const note = model.sample(c, temperature(), rng);
      steps.push({ ctx: c, p, note });
      ctx.audio.playNote(DEGREE_MIDI[note], start + i * beat(), beat() * 0.9, 0.85);
      seq.push(note);
    }
    lastSeq = seq.slice(prompt.length);
    lastPrompt = prompt;
    playback = { kind: 'recall', seq, steps, prompt, start, dur: GEN_NOTES * beat() + 0.5, step: -1 };
    if (!asker.isOpen()) {
      for (const [i, d] of prompt.entries()) {
        ctx.audio.playNote(DEGREE_MIDI[d], ctx.audio.time() + i * 0.2, 0.4, 0.7);
      }
    }
    refreshLabels();
    renderAsker();
  }

  function stand(x: number, z: number, color: number): void {
    addBox(scene, [0.7, 0.95, 0.7], [x, 0.475, z], palette.wood, { colliders });
    addBox(scene, [0.85, 0.12, 0.85], [x, 1.0, z], color);
  }
  function anchorAt(x: number, z: number, y = 1.1): THREE.Object3D {
    const a = new THREE.Object3D();
    a.position.set(x, y, z);
    scene.add(a);
    return a;
  }

  // key shelf in the corner (visual home of the ask keys)
  addBox(scene, [1.6, 1.0, 0.6], [-6.6, 0.5, -2.0], palette.wood, { colliders });

  stand(-4.6, 0.9, 0x6a8a6a);
  interactables.push({
    object: anchorAt(-4.6, 0.9),
    range: 1.9,
    label: () => (asker.isOpen() ? 'Close the keys' : 'Play a prompt (open the keys)'),
    act: () => {
      if (asker.isOpen()) asker.close();
      else asker.open();
      refreshLabels();
    },
  });

  stand(-6.3, 3.2, 0x8a6a3a);
  interactables.push({
    object: anchorAt(-6.3, 3.2),
    range: 1.9,
    label: () => `Model: ${infoFor(selectedModelId).name} — next`,
    act: () => {
      if (playback) return;
      const models = listModels();
      const idx = models.findIndex((m) => m.id === selectedModelId);
      const next = models[(idx + 1) % models.length];
      selectedModelId = next.id;
      select(next.id);
      model = buildModel(next.id);
      showExpectation();
      ctx.toast(`Loaded "${next.name}" — ${next.kind === 'network' ? 'a real network' : 'a counter'}${next.source === 'trained' ? ', trained by you' : ''}. Same prompt, different singer.`);
    },
  });

  stand(-4.6, 3.2, 0x8a6a3a);
  interactables.push({
    object: anchorAt(-4.6, 3.2),
    range: 1.9,
    label: () => `Heat: ${TEMPS[tempIdx].name}`,
    act: () => {
      tempIdx = (tempIdx + 1) % TEMPS.length;
      showExpectation();
      ctx.toast(`Temperature: ${TEMPS[tempIdx].name}`);
    },
  });

  stand(4.6, 0.9, 0xb5651d);
  interactables.push({
    object: anchorAt(4.6, 0.9),
    range: 1.9,
    label: () => (playback ? null : 'Let it continue'),
    act: () => continuePrompt(),
  });

  stand(4.6, 3.2, 0x5c6b8a);
  interactables.push({
    object: anchorAt(4.6, 3.2),
    range: 1.9,
    label: () => `Memory: ${memory()} note${memory() > 1 ? 's' : ''}`,
    act: () => {
      memoryIdx = (memoryIdx + 1) % 2;
      showExpectation();
      ctx.toast(`The model now remembers ${memory()} note${memory() > 1 ? 's' : ''}.`);
    },
  });

  stand(-2.8, 2.2, 0x7a6a8a);
  interactables.push({
    object: anchorAt(-2.8, 2.2),
    range: 1.9,
    label: () => 'Help — what is this?',
    act: () => help.open(ECHO_HELP),
  });
  helpDesk: {
    const l = dynamicLabel(scene, [-2.8, 2.5, 2.2], 0.58);
    l.set('Help — what is this?');
  }

  stand(6.3, 3.2, 0x6a8a6a);
  interactables.push({
    object: anchorAt(6.3, 3.2),
    range: 1.9,
    label: () => `Labels: ${LABEL_MODES[labelIdx]}`,
    act: () => {
      labelIdx = (labelIdx + 1) % LABEL_MODES.length;
      showExpectation();
    },
  });

  addBox(scene, [0.8, 1.0, 0.8], [6.1, 0.5, -3.2], palette.stone, { colliders });
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 8),
    mat(0xbfd4ff, { rough: 0.25, emissive: 0x3a5a9a }),
  );
  orb.position.set(6.1, 1.35, -3.2);
  scene.add(orb);
  let taken = ctx.state.hasKeepsake(KEEPSAKE);
  if (taken) orb.visible = false;
  interactables.push({
    object: anchorAt(6.1, -3.2, 1.15),
    range: 1.8,
    label: () => (goalReached && !taken ? 'Take the Echo' : null),
    act: () => {
      if (!goalReached || taken) return;
      taken = true;
      orb.visible = false;
      const earned = ctx.state.grantKeepsake(
        'echo-hall',
        KEEPSAKE,
        'The Echo',
        'The echo hall plays whatever model I load, and it answers the prompt I play — note by note, with the notes it expects next, not the ones that make sense. More heat and it wanders; more memory and it keeps the path; another model and it answers as a different singer.',
      );
      if (earned) {
        ctx.audio.playChord([DEGREE_MIDI[0], DEGREE_MIDI[2], DEGREE_MIDI[4], DEGREE_MIDI[7]]);
        ctx.toast('Keepsake earned: The Echo');
      }
    },
  });

  interactables.push({
    object: anchorAt(0, 4.9),
    label: () => 'Return to the clearing',
    act: () => ctx.transition('hub.fromEcho'),
  });

  player.teleport(0, 4.2, Math.PI);
  showExpectation();
  ctx.toast('Play a prompt on the keys — the model answers with what it expects next.');

  return {
    id: 'echo',
    scene,
    colliders,
    bounds,
    interactables,
    cam: { pos: [0, 11.5, 9.8], look: [0, 1.7, -1.8], fit: 6.6 },
    debug: () => ({
      model: selectedModelId,
      modelName: infoFor(selectedModelId).name,
      models: listModels().length,
      source: infoFor(selectedModelId).source,
      promptNotes: askNotes,
      expects: expects.map((e) => e.note),
      keysOpen: asker.isOpen(),
      temp: TEMPS[tempIdx].name,
      memory: memory(),
      labels: LABEL_MODES[labelIdx],
      playing: playback !== null,
      lastSeq,
      lastPrompt,
      kind: model.kind,
      panel: net.panelKind,
      size: model.sizeLabel(),
      ready: model.sizeLabel().length > 0,
    }),
    update(dt, t) {
      net.update(dt, t);
      orb.rotation.y += dt * 0.8;
      orb.position.y = 1.35 + (orb.visible ? Math.sin(t * 1.6) * 0.05 : 0);
      panelGlow.intensity = 7 + Math.sin(t * 2.3) * 1.5;

      const pb = playback;
      if (!pb) return;
      const elapsed = ctx.audio.time() - pb.start;
      const idx = Math.floor(elapsed / beat());
      if (idx !== pb.step && idx >= 0 && idx < pb.seq.length) {
        pb.step = idx;
        const st = pb.steps[Math.min(idx, pb.steps.length - 1)];
        presentModel(net, model, st.ctx, temperature(), st.note);
        const gen = pb.seq.slice(pb.prompt.length);
        ctx.caption(
          `${infoFor(selectedModelId).name} · prompt ${pb.prompt.map((d) => WORDS[d]).join(' ')} ▸ ${gen
            .slice(0, idx + 1)
            .map((d) => WORDS[d])
            .join(' ')}`,
        );
      }
      if (elapsed > pb.dur) {
        playback = null;
        refreshLabels();
        renderAsker();
        if (lastSeq.length >= 6 && !goalReached) {
          goalReached = true;
          ctx.toast('It carried your phrase. A token waits on the pedestal.');
        }
      }
    },
    dispose() {
      help.dispose();
      asker.dispose();
      ctx.input.setSuppressed(false);
      net.dispose();
    },
  };
}
