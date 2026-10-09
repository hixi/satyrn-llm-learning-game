import { AssetStore } from './engine/assets';
import { AudioKit } from './engine/audio';
import { CameraRig } from './engine/cameraRig';
import { OccluderFader } from './engine/fader';
import { InputManager } from './engine/input';
import { createRenderer, webgl2Available } from './engine/renderer';
import { PlayerAvatar } from './game/player';
import { GameState } from './game/save';
import { timeLabel } from './game/time';
import { SceneManager } from './game/sceneManager';
import { Interactable, WorldContext, interactableAt } from './game/world';
import { buildUi } from './ui/ui';
import { buildExpositionHost } from './ui/exposition';
import type { Exposition } from './ui/exposition';
import { fit } from './expositions/fit';
import { balloons } from './expositions/balloons';
import { wordLibrary } from './expositions/wordLibrary';
import { piano } from './expositions/piano';
import { soundingSure } from './expositions/soundingSure';
import { createEchoHall } from './worlds/echoHall';
import { createHistoryHall } from './worlds/historyHall';
import { createHub } from './worlds/hub';
import { createTrainingHall } from './worlds/trainingHall';

declare global {
  interface Window {
    __satyrn?: {
      teleport(x: number, z: number, yaw?: number): void;
      probe(): {
        pos: number[];
        held: string | null;
        keepsakes: number;
        journal: number;
        audio: string;
        ghosted: number;
        time: string;
        [key: string]: unknown;
      };
    };
  }
}

function boot(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const { renderer, camera } = createRenderer(canvas);
  const rig = new CameraRig(camera);
  const input = new InputManager();
  input.attachKeyboard();
  const player = new PlayerAvatar();
  const state = new GameState();
  const assets = new AssetStore();
  const audio = new AudioKit();
  const fader = new OccluderFader([player.object]);
  const unlockAudio = () => audio.ensure();
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const ui = buildUi(input, state, isTouch);
  const expo = buildExpositionHost((open) => input.setSuppressed(open), {
    playNote: (midi, when, dur, vel) => audio.playNote(midi, when, dur, vel),
  });
  const exhibits: Record<string, Exposition> = {
    fit,
    balloons,
    words: wordLibrary,
    piano,
    sure: soundingSure,
  };

  const ctx: WorldContext = {
    player,
    state,
    assets,
    audio,
    input,
    transition: (route: string) => sceneManager.navigate(route),
    toast: (text: string) => ui.toast(text),
    caption: (text: string | null) => ui.setCaption(text),
    openExposition: (id: string) => {
      if (exhibits[id]) expo.open(exhibits[id]);
    },
  };

  const sceneManager = new SceneManager(ctx, player, {
    renderer,
    camera,
    transitionFx: ui.transitionFx,
  });
  sceneManager.register('hub', createHub);
  sceneManager.register('training', createTrainingHall);
  sceneManager.register('echo', createEchoHall);
  sceneManager.register('history', createHistoryHall);

  window.__satyrn = {
    teleport: (x: number, z: number, yaw = Math.PI) => player.teleport(x, z, yaw),
    probe: () => ({
      pos: [player.pos.x, player.pos.y, player.pos.z],
      held: player.held?.id ?? null,
      keepsakes: state.data.keepsakes.filter((k) => !k.id.startsWith('seen:')).length,
      journal: state.data.journal.length,
      audio: audio.running ? 'running' : 'off',
      time: timeLabel(),
      ghosted: fader.activeCount,
      ...(sceneManager.world?.debug?.() ?? {}),
    }),
  };

  window.addEventListener('hashchange', () => void sceneManager.loadFromHash());
  void sceneManager.loadFromHash();

  let last = performance.now();
  let t = 0;

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    sceneManager.update(dt, t);
    const world = sceneManager.world;
    if (world) {
      const mv = input.getMove();
      const wv = rig.moveToWorldVector(mv.x, mv.y);
      player.update(dt, wv.x * player.speed, wv.y * player.speed, world);

      let best: Interactable | null = null;
      let bestD = Infinity;
      for (const it of world.interactables) {
        if (it.label() === null) continue;
        const d = interactableAt(it).distanceTo(player.pos);
        if (d <= (it.range ?? 1.9) && d < bestD) {
          bestD = d;
          best = it;
        }
      }
      ui.setPrompt(best && !input.isSuppressed ? best.label() : null);
      if (input.consumeInteract() && best) best.act();
    }

    const rot = input.consumeRotate();
    if (rot === -1 || rot === 1) rig.snap(rot);
    rig.update(dt, player.pos, sceneManager.world?.cam ?? null);
    if (sceneManager.world) {
      fader.update(dt, camera, player.pos, sceneManager.world.scene);
      player.setXray(fader.activeCount > 0);
    }
    sceneManager.render();
  };
  requestAnimationFrame(frame);
}

if (webgl2Available()) {
  boot();
} else {
  (document.getElementById('game') as HTMLElement).hidden = true;
  (document.getElementById('fallback') as HTMLElement).hidden = false;
}
