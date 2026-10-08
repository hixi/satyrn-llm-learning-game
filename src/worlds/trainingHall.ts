import * as THREE from 'three';
import { Box2 } from '../engine/collisions';
import { addBox, dynamicLabel, makeLabel, mat, palette } from '../engine/sceneKit';
import { NetPanel } from '../game/music/netPanel';
import { DEGREE_MIDI, TransitionModel, WORDS } from '../game/music/model';
import {
  MODEL_SHELF_SIZE,
  addModel,
  buildModel,
  forgetAllModels,
  infoFor,
  listModels,
  select,
  selectedId,
} from '../game/music/store';
import { TRAINING_HELP } from '../game/help';
import { buildComposer } from '../ui/composer';
import { buildHelp } from '../ui/help';
import { Interactable, World, WorldContext } from '../game/world';

const KEEPSAKE = 'first-model';
const BEAT = 0.42;
const ROOM_X = 7.5;
const ROOM_Z = 5.5;
const DRAFT_KEY = 'satyrn25d.notebook.v1';
const MAX_NOTES_PER_PHRASE = 16;
const MAX_PHRASES = 4;

interface TrainStep {
  context: number[];
  next: number;
}

interface Training {
  steps: TrainStep[];
  idx: number;
  model: TransitionModel;
  start: number;
  perStep: number;
}

export function createTrainingHall(ctx: WorldContext, spawnKey: string): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x241d24);

  const colliders: Box2[] = [];
  const bounds: Box2 = { minX: -ROOM_X + 0.4, maxX: ROOM_X - 0.4, minZ: -ROOM_Z + 0.5, maxZ: ROOM_Z - 0.5 };
  const interactables: Interactable[] = [];
  const player = ctx.player;

  addBox(scene, [15.6, 0.2, 11.6], [0, -0.1, 0], palette.floor);
  addBox(scene, [0.5, 3.4, 11.6], [-ROOM_X, 1.7, 0], palette.wallInner, { colliders });
  addBox(scene, [0.5, 3.4, 11.6], [ROOM_X, 1.7, 0], palette.wallInner, { colliders });
  addBox(scene, [15.6, 3.4, 0.5], [0, 1.7, -ROOM_Z], palette.wallInner, { colliders });

  scene.add(new THREE.HemisphereLight(0xffc9a0, 0x241a18, 0.75));
  const dir = new THREE.DirectionalLight(0xfff1d6, 0.55);
  dir.position.set(-6, 10, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -9;
  dir.shadow.camera.right = 9;
  dir.shadow.camera.top = 9;
  dir.shadow.camera.bottom = -9;
  scene.add(dir);
  const glow = new THREE.PointLight(0xffcf9a, 8, 16, 1.6);
  glow.position.set(0, 2.4, -2.6);
  scene.add(glow);

  const net = new NetPanel(scene);
  net.setLabelMode(2);

  // ————— notebook state —————
  interface Draft {
    phrases: number[][];
    current: number;
  }
  const emptyDraft: Draft = { phrases: [[]], current: 0 };
  function loadDraft(): Draft {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        if (Array.isArray(d.phrases) && d.phrases.length > 0 && d.phrases.every((p) => Array.isArray(p))) {
          return { phrases: d.phrases, current: Math.min(d.current ?? 0, d.phrases.length - 1) };
        }
      }
    } catch {
      /* fresh notebook */
    }
    return emptyDraft;
  }
  const draft = loadDraft();
  let training: Training | null = null;
  let trainedNow = false;
  let taken = ctx.state.hasKeepsake(KEEPSAKE);

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* not persisted */
    }
  };

  const notesTotal = () => draft.phrases.reduce((n, p) => n + p.length, 0);
  let model = buildModel(selectedId());

  // ————— in-world controls —————
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

  const help = buildHelp((open) => ctx.input.setSuppressed(open));

  const composerHandle = buildComposer({
    onNote: (degree) => {
      const phrase = draft.phrases[draft.current];
      if (phrase.length >= MAX_NOTES_PER_PHRASE) {
        ctx.toast('This phrase is full — start a new one.');
        return;
      }
      phrase.push(degree);
      ctx.audio.playNote(DEGREE_MIDI[degree], 0, 0.4, 0.7);
      saveDraft();
      refreshComposer();
    },
    onUndo: () => {
      draft.phrases[draft.current].pop();
      saveDraft();
      refreshComposer();
    },
    onClear: () => {
      draft.phrases[draft.current] = [];
      saveDraft();
      refreshComposer();
    },
    onNewPhrase: () => {
      if (draft.phrases.length >= MAX_PHRASES) {
        ctx.toast('Four phrases is plenty for one model.');
        return;
      }
      draft.phrases.push([]);
      draft.current = draft.phrases.length - 1;
      saveDraft();
      refreshComposer();
    },
    onSelectPhrase: (i) => {
      draft.current = i;
      refreshComposer();
    },
    onDeletePhrase: (i) => {
      draft.phrases.splice(i, 1);
      if (draft.phrases.length === 0) draft.phrases.push([]);
      draft.current = Math.min(draft.current, draft.phrases.length - 1);
      saveDraft();
      refreshComposer();
    },
    onPlay: () => audition(),
    onTrain: () => train(),
    onOpenChange: (open) => {
      ctx.input.setSuppressed(open);
      if (open) refreshComposer();
      refreshComposerLabel();
    },
  });

  function refreshComposer(): void {
    composerHandle.render({ phrases: draft.phrases, current: draft.current, busy: training !== null });
  }

  function audition(): void {
    const phrase = draft.phrases[draft.current];
    if (phrase.length === 0) {
      ctx.toast('The current phrase is empty.');
      return;
    }
    const start = ctx.audio.time() + 0.15;
    phrase.forEach((degree, i) => ctx.audio.playNote(DEGREE_MIDI[degree], start + i * BEAT, BEAT * 0.9, 0.8));
    ctx.caption(`phrase ${draft.current + 1}: ${phrase.map((d) => WORDS[d]).join(' ')}`);
    const ctxNotes = phrase.slice(0, -1);
    const last = ctxNotes[ctxNotes.length - 1] ?? phrase[0];
    net.show(model.distribution([last], 1), last, phrase[phrase.length - 1]);
  }

  function train(): void {
    if (training) return;
    const usable = draft.phrases.filter((p) => p.length >= 2);
    const total = draft.phrases.reduce((n, p) => n + p.length, 0);
    if (total < 6 || usable.length === 0) {
      ctx.toast('Add at least six notes before training.');
      return;
    }
    const steps: TrainStep[] = [];
    for (const phrase of draft.phrases) {
      for (let i = 1; i < phrase.length; i++) steps.push({ context: phrase.slice(0, i), next: phrase[i] });
    }
    training = { steps, idx: 0, model: new TransitionModel(), start: ctx.audio.time(), perStep: 0.14 };
    composerHandle.setCollapsed(true);
    composerHandle.render({ phrases: draft.phrases, current: draft.current, busy: true });
    ctx.toast(`Training on ${steps.length} note transitions…`);
  }

  function finishTraining(t: Training): void {
    const phrases = draft.phrases.filter((p) => p.length > 0).map((p) => p.slice());
    const { entry, dropped } = addModel(phrases);
    trainedNow = true;
    model = t.model;
    training = null;
    composerHandle.setCollapsed(false);
    composerHandle.render({ phrases: draft.phrases, current: draft.current, busy: false });
    refreshShelf();
    rest();
    ctx.toast(`Learned ${t.steps.length} transitions — every note it saw, and the note that followed. Saved as "${entry.name}".`);
    if (dropped) ctx.toast(`The shelf was full — "${dropped.name}" was shelved away.`);
  }

  function rest(): void {
    const info = infoFor(selectedId());
    const source = info.phrases[0] ?? [0];
    const last = source[source.length - 1] ?? 0;
    net.show(model.distribution([last], 1), last, null);
    ctx.caption(
      trainedNow
        ? `Model "${info.name}" saved · Step 3 · play with it in the Echo Hall (the other door in the clearing)`
        : `Step 1 · open the notebook and play notes · Step 2 · Train — the model counts which note follows which`,
    );
    refreshComposer();
  }

  // ————— stands —————
  stand(3.4, 1.2, 0x6a8a6a);
  const composerAnchor = anchorAt(3.4, 1.2);
  const composerLabel = dynamicLabel(scene, [3.4, 2.5, 1.2], 0.62);
  const refreshComposerLabel = () =>
    composerLabel.set(composerHandle.isOpen() ? '1 · Close the notebook' : '1 · Open the notebook');
  refreshComposerLabel();
  interactables.push({
    object: composerAnchor,
    range: 1.9,
    label: () => (composerHandle.isOpen() ? '1 · Close the notebook' : '1 · Open the notebook'),
    act: () => {
      if (composerHandle.isOpen()) composerHandle.close();
      else composerHandle.open();
      refreshComposerLabel();
    },
  });

  stand(-3.4, 1.2, 0xb5651d);
  const trainAnchor = anchorAt(-3.4, 1.2);
  const trainLabel = dynamicLabel(scene, [-3.4, 2.5, 1.2], 0.62);
  trainLabel.set('2 · Train on these phrases');
  interactables.push({
    object: trainAnchor,
    range: 1.9,
    label: () => (training ? null : '2 · Train on these phrases'),
    act: () => train(),
  });

  stand(-6.3, 3.2, 0x8a6a3a);
  const shelfAnchor = anchorAt(-6.3, 3.2);
  const shelfLabel = dynamicLabel(scene, [-6.3, 2.5, 3.2], 0.58);
  const refreshShelf = () => {
    const info = infoFor(selectedId());
    const trained = listModels().filter((m) => m.source === 'trained').length;
    shelfLabel.set(`Model: ${info.name} (${trained}/${MODEL_SHELF_SIZE} saved)`);
  };
  refreshShelf();
  interactables.push({
    object: shelfAnchor,
    range: 1.9,
    label: () => 'Next model on the shelf',
    act: () => {
      const models = listModels();
      const idx = models.findIndex((m) => m.id === selectedId());
      const next = models[(idx + 1) % models.length];
      select(next.id);
      model = buildModel(next.id);
      refreshShelf();
      rest();
      ctx.toast(`Picked "${next.name}" for the halls.`);
    },
  });

  stand(-2.8, 3.6, 0x7a6a8a);
  const helpAnchor = anchorAt(-2.8, 3.6);
  const helpLabel = dynamicLabel(scene, [-2.8, 2.5, 3.6], 0.58);
  helpLabel.set('Help — what is this?');
  interactables.push({
    object: helpAnchor,
    range: 1.9,
    label: () => 'Help — what is this?',
    act: () => help.open(TRAINING_HELP),
  });

  stand(6.3, 3.2, 0x7a5a5a);
  const forgetAnchor = anchorAt(6.3, 3.2);
  const forgetLabel = dynamicLabel(scene, [6.3, 2.5, 3.2], 0.58);
  forgetLabel.set('Forget all models');
  interactables.push({
    object: forgetAnchor,
    range: 1.9,
    label: () => 'Forget all models',
    act: () => {
      forgetAllModels();
      model = buildModel(selectedId());
      refreshShelf();
      rest();
      ctx.toast('Your models are gone — only the old songs remain.');
    },
  });

  addBox(scene, [0.8, 1.0, 0.8], [-6.0, 0.5, -3.2], palette.stone, { colliders });
  const token = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    mat(0xffd9a0, { rough: 0.3, emissive: 0x7a5a20 }),
  );
  token.position.set(-6.0, 1.35, -3.2);
  scene.add(token);
  if (taken) token.visible = false;
  const keepAnchor = anchorAt(-6.0, -3.2, 1.15);
  interactables.push({
    object: keepAnchor,
    range: 1.8,
    label: () => (trainedNow && !taken ? 'Take the First Model' : null),
    act: () => {
      if (!trainedNow || taken) return;
      taken = true;
      token.visible = false;
      const earned = ctx.state.grantKeepsake(
        'training-hall',
        KEEPSAKE,
        'The First Model',
        'The training hall taught me that a model is only its data: I fed it phrases, watched it count which note follows which, and it learned exactly that — nothing more, nothing missing.',
      );
      if (earned) {
        ctx.audio.playChord([DEGREE_MIDI[0], DEGREE_MIDI[2], DEGREE_MIDI[4]]);
        ctx.toast('Keepsake earned: The First Model');
      }
    },
  });

  const exitAnchor = anchorAt(0, 4.9);
  interactables.push({
    object: exitAnchor,
    label: () => 'Return to the clearing',
    act: () => ctx.transition('hub.fromTraining'),
  });

  const panelSign = makeLabel('left: a note you played · right: what it expects next · line = how often', 0.46);
  panelSign.position.set(0, 4.75, -3.5);
  scene.add(panelSign);
  const stepSign = makeLabel('3 · hear your model in the Echo Hall', 0.55);
  stepSign.position.set(0, 2.6, 3.4);
  scene.add(stepSign);

  player.teleport(0, 4.0, Math.PI);
  ctx.toast('A model just counts which note follows which. Compose, Train, then hear it next door.');
  refreshComposer();
  rest();

  return {
    id: 'training',
    scene,
    colliders,
    bounds,
    interactables,
    cam: { pos: [0, 11.5, 9.8], look: [0, 1.7, -1.8], fit: 6.6 },
    debug: () => {
      const info = infoFor(selectedId());
      return {
        source: info.source,
        model: info.name,
        models: listModels().length,
        phrases: draft.phrases.map((p) => p.length),
        current: draft.current,
        busy: training !== null,
        step: training?.idx ?? 0,
        total: training?.steps.length ?? 0,
        transitions: model.transitions,
        trainedNow,
        notes: notesTotal(),
        composerOpen: composerHandle.isOpen(),
      };
    },
    update(_dt, time) {
      net.update(_dt, time);
      token.rotation.y += _dt * 0.8;
      if (token.visible) token.position.y = 1.35 + Math.sin(time * 1.6) * 0.05;
      glow.intensity = 7 + Math.sin(time * 2.1) * 1.5;

      const t = training;
      if (t) {
        const elapsed = ctx.audio.time() - t.start;
        while (t.idx < t.steps.length && elapsed >= t.idx * t.perStep) {
          const step = t.steps[t.idx];
          t.model.observe(step.context, step.next);
          t.idx++;
          net.show(
            t.model.distribution(step.context, 1),
            step.context[step.context.length - 1],
            step.next,
          );
          ctx.caption(
            `learning ${t.idx}/${t.steps.length} · after "${WORDS[step.context[step.context.length - 1]]}" it saw "${WORDS[step.next]}"`,
          );
        }
        if (t.idx >= t.steps.length) finishTraining(t);
      }
    },
    dispose() {
      help.dispose();
      composerHandle.dispose();
      ctx.input.setSuppressed(false);
      net.dispose();
    },
  };
}
