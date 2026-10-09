import { InputManager } from '../engine/input';
import { GameState } from '../game/save';
import { cycleTime, timeLabel } from '../game/time';

export interface UI {
  setPrompt(text: string | null): void;
  setCaption(text: string | null): void;
  toast(text: string): void;
  transitionFx(swap: () => void): Promise<void>;
}

export function buildUi(input: InputManager, state: GameState, isTouch: boolean): UI {
  const root = document.getElementById('ui')!;
  root.innerHTML = [
    '<div id="hud-top">',
    '<div><div id="title">Satyrn — Wayfarer’s Ground</div><div id="keepsakes"></div></div>',
    '<div id="hud-buttons"><button class="ui-btn" id="time-btn">time 1×</button><button class="ui-btn" id="journal-btn">Journal</button></div>',
    '</div>',
    '<div id="toasts"></div>',
    '<div id="prompt"></div>',
    '<div id="caption"></div>',
    '<div id="touch">',
    '<div id="stick-zone"></div>',
    '<div id="stick-base"></div>',
    '<div id="stick-thumb"></div>',
    '<button id="touch-interact" aria-label="Interact">✦</button>',
    '</div>',
    '<div id="journal"><div id="journal-panel">',
    '<button class="ui-btn" id="journal-close">Close</button>',
    '<h2>Journal</h2>',
    '<ul id="journal-list"></ul>',
    '</div></div>',
  ].join('');

  const promptEl = document.getElementById('prompt')!;
  const captionEl = document.getElementById('caption')!;
  const toastsEl = document.getElementById('toasts')!;
  const keepsakesEl = document.getElementById('keepsakes')!;
  const journalEl = document.getElementById('journal')!;
  const journalList = document.getElementById('journal-list')!;
  const interactBtn = document.getElementById('touch-interact')!;
  const fadeEl = document.getElementById('fade')!;

  function refreshHud(): void {
    const n = state.data.keepsakes.filter((k) => !k.id.startsWith('seen:')).length;
    keepsakesEl.textContent = n === 0 ? '' : '✦ ' + n + ' keepsake' + (n === 1 ? '' : 's');
    if (journalEl.classList.contains('open')) renderJournal();
  }

  function renderJournal(): void {
    journalList.innerHTML = '';
    if (state.data.journal.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Nothing written yet. Walk into a world and it will have something to say.';
      journalList.appendChild(li);
      return;
    }
    for (const entry of state.data.journal) {
      const li = document.createElement('li');
      li.textContent = entry.text;
      journalList.appendChild(li);
    }
  }

  state.onChanged = refreshHud;
  refreshHud();

  const timeBtn = document.getElementById('time-btn')!;
  timeBtn.textContent = `time ${timeLabel()}`;
  timeBtn.addEventListener('click', () => {
    timeBtn.textContent = `time ${cycleTime()}`;
  });

  document.getElementById('journal-btn')!.addEventListener('click', () => {
    journalEl.classList.toggle('open');
    renderJournal();
  });
  document.getElementById('journal-close')!.addEventListener('click', () => {
    journalEl.classList.remove('open');
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') journalEl.classList.remove('open');
  });

  function setPrompt(text: string | null): void {
    if (text === null) {
      promptEl.classList.remove('visible');
      interactBtn.classList.remove('visible');
      return;
    }
    promptEl.innerHTML = '';
    promptEl.append(text);
    if (!isTouch) {
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = 'E';
      promptEl.append(key);
    }
    promptEl.classList.add('visible');
    interactBtn.classList.add('visible');
  }

  function setCaption(text: string | null): void {
    if (text === null) {
      captionEl.classList.remove('visible');
      captionEl.textContent = '';
      return;
    }
    captionEl.textContent = text;
    captionEl.classList.add('visible');
  }

  function toast(text: string): void {    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    toastsEl.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function transitionFx(swap: () => void): Promise<void> {
    return new Promise((resolve) => {
      fadeEl.classList.add('black');
      setTimeout(() => {
        swap();
        fadeEl.classList.remove('black');
        resolve();
      }, 300);
    });
  }

  if (isTouch) {
    document.body.classList.add('touch');
    const zone = document.getElementById('stick-zone')!;
    const base = document.getElementById('stick-base')!;
    const thumb = document.getElementById('stick-thumb')!;
    const R = 56;
    let pid: number | null = null;
    let ox = 0;
    let oy = 0;

    zone.addEventListener('pointerdown', (e) => {
      pid = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      zone.setPointerCapture(pid);
      base.style.left = ox - 60 + 'px';
      base.style.top = oy - 60 + 'px';
      thumb.style.left = ox - 24 + 'px';
      thumb.style.top = oy - 24 + 'px';
      base.classList.add('active');
      thumb.classList.add('active');
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      let dx = e.clientX - ox;
      let dy = e.clientY - oy;
      const l = Math.hypot(dx, dy);
      if (l > R) {
        dx *= R / l;
        dy *= R / l;
      }
      thumb.style.left = ox + dx - 24 + 'px';
      thumb.style.top = oy + dy - 24 + 'px';
      input.setStick(dx / R, dy / R);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = null;
      input.setStick(0, 0);
      base.classList.remove('active');
      thumb.classList.remove('active');
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
    interactBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.pressInteract();
    });
  }

  return { setPrompt, setCaption, toast, transitionFx };
}
