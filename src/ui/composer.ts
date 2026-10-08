import { NOTE_NAMES, WORDS } from '../game/music/model';

export interface ComposerState {
  phrases: number[][];
  current: number;
  busy: boolean;
}

export interface ComposerCallbacks {
  onNote(degree: number): void;
  onUndo(): void;
  onClear(): void;
  onNewPhrase(): void;
  onSelectPhrase(index: number): void;
  onDeletePhrase(index: number): void;
  onPlay(): void;
  onTrain(): void;
  onOpenChange(open: boolean): void;
}

export interface ComposerHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  setCollapsed(v: boolean): void;
  render(state: ComposerState): void;
  dispose(): void;
}

/** The training notebook: an eight-key piano plus the phrase strips being fed to the model. */
export function buildComposer(cb: ComposerCallbacks): ComposerHandle {
  const host = document.createElement('div');
  host.id = 'composer-host';
  host.innerHTML = [
    '<div class="composer" hidden>',
    '<div class="sheet">',
    '<div class="sheet-head"><b>Training Notebook</b><span class="ph-count"></span><button class="c-close ui-btn">Close</button></div>',
    '<div class="phrases"></div>',
    '<div class="keys"></div>',
    '<div class="actions">',
    '<button class="c-play ui-btn">▶ Play phrase</button>',
    '<button class="c-undo ui-btn">↶ Undo</button>',
    '<button class="c-clear ui-btn">✕ Clear</button>',
    '<button class="c-new ui-btn">＋ New phrase</button>',
    '<button class="c-train ui-btn primary">⚒ Train</button>',
    '</div>',
    '<div class="hint">Keys 1–8 play &amp; add notes · Backspace undo · Enter train · Esc close</div>',
    '</div>',
    '</div>',
  ].join('');
  document.getElementById('ui')!.appendChild(host);

  const panel = host.querySelector('.composer') as HTMLElement;
  const phrasesEl = host.querySelector('.phrases') as HTMLElement;
  const keysEl = host.querySelector('.keys') as HTMLElement;
  const countEl = host.querySelector('.ph-count') as HTMLElement;
  const actions = host.querySelector('.actions') as HTMLElement;
  let open = false;
  let busy = false;

  for (let d = 0; d < 8; d++) {
    const btn = document.createElement('button');
    btn.className = 'key ui-btn';
    btn.innerHTML = `<b>${NOTE_NAMES[d]}</b><i>${WORDS[d]}</i>`;
    btn.addEventListener('click', () => cb.onNote(d));
    keysEl.appendChild(btn);
  }

  (host.querySelector('.c-play') as HTMLElement).addEventListener('click', () => cb.onPlay());
  (host.querySelector('.c-undo') as HTMLElement).addEventListener('click', () => cb.onUndo());
  (host.querySelector('.c-clear') as HTMLElement).addEventListener('click', () => cb.onClear());
  (host.querySelector('.c-new') as HTMLElement).addEventListener('click', () => cb.onNewPhrase());
  (host.querySelector('.c-train') as HTMLElement).addEventListener('click', () => cb.onTrain());
  (host.querySelector('.c-close') as HTMLElement).addEventListener('click', () => close());

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    const digit = /^(?:Digit|Numpad)([1-8])$/.exec(e.code);
    if (digit) {
      e.preventDefault();
      cb.onNote(Number(digit[1]) - 1);
      return;
    }
    if (e.code === 'Backspace') {
      e.preventDefault();
      cb.onUndo();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (!busy) cb.onTrain();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKey);

  function render(state: ComposerState): void {
    busy = state.busy;
    const total = state.phrases.reduce((n, p) => n + p.length, 0);
    countEl.textContent = `${state.phrases.length} phrase${state.phrases.length === 1 ? '' : 's'} · ${total} notes`;
    phrasesEl.innerHTML = '';
    state.phrases.forEach((phrase, i) => {
      const row = document.createElement('div');
      row.className = 'phrase-row' + (i === state.current ? ' current' : '');
      const name = document.createElement('button');
      name.className = 'ph-name ui-btn';
      name.textContent = `Phrase ${i + 1}`;
      name.addEventListener('click', () => cb.onSelectPhrase(i));
      row.appendChild(name);
      const strip = document.createElement('div');
      strip.className = 'strip';
      if (phrase.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'empty';
        empty.textContent = 'tap the keys to add notes';
        strip.appendChild(empty);
      }
      for (const d of phrase) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `<b>${NOTE_NAMES[d]}</b><i>${WORDS[d]}</i>`;
        strip.appendChild(chip);
      }
      row.appendChild(strip);
      if (state.phrases.length > 1) {
        const del = document.createElement('button');
        del.className = 'ph-del ui-btn';
        del.textContent = '✕';
        del.addEventListener('click', () => cb.onDeletePhrase(i));
        row.appendChild(del);
      }
      phrasesEl.appendChild(row);
    });
    for (const el of Array.from(actions.querySelectorAll('button'))) {
      (el as HTMLButtonElement).disabled = busy;
    }
    keysEl.classList.toggle('busy', busy);
  }

  function setCollapsed(v: boolean): void {
    (host.querySelector('.sheet') as HTMLElement).classList.toggle('collapsed', v);
  }

  function openSheet(): void {
    panel.hidden = false;
    open = true;
    cb.onOpenChange(true);
  }
  function close(): void {
    panel.hidden = true;
    open = false;
    cb.onOpenChange(false);
  }


  function dispose(): void {
    window.removeEventListener('keydown', onKey);
    host.remove();
  }

  return { dispose, open: openSheet, close, isOpen: () => open, setCollapsed, render };
}
