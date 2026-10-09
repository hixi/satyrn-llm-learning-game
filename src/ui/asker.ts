import { NOTE_NAMES, WORDS, tokenWord } from '../game/music/model';

export interface AskerState {
  notes: number[];
  expects: { note: number; p: number }[];
  busy: boolean;
}

export interface AskerCallbacks {
  onNote(degree: number): void;
  onClear(): void;
  onSample(): void;
  onContinue(): void;
  onOpenChange(open: boolean): void;
}

export interface AskerHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  render(state: AskerState): void;
  dispose(): void;
}

/** The inference-side input: the player plays the prompt, the model answers. */
export function buildAsker(cb: AskerCallbacks): AskerHandle {
  const host = document.createElement('div');
  host.id = 'asker-host';
  host.innerHTML = [
    '<div class="composer asker" hidden>',
    '<div class="sheet">',
    '<div class="sheet-head"><b>Ask the Model</b><span class="ph-count"></span><button class="ask-close ui-btn">Close</button></div>',
    '<div class="phrases"><div class="phrase-row current"><span class="ph-name">Prompt</span><div class="strip"></div></div></div>',
    '<div class="expects"></div>',
    '<div class="keys"></div>',
    '<div class="actions">',
    '<button class="ask-sample ui-btn">↺ Sample</button>',
    '<button class="ask-clear ui-btn">✕ Clear</button>',
    '<button class="ask-continue ui-btn primary">▶ Let it continue</button>',
    '</div>',
    '<div class="hint">1–8 play &amp; add prompt notes (up to 4) · Enter continue · Esc close</div>',
    '</div>',
    '</div>',
  ].join('');
  document.getElementById('ui')!.appendChild(host);

  const panel = host.querySelector('.asker') as HTMLElement;
  const strip = host.querySelector('.strip') as HTMLElement;
  const expectsEl = host.querySelector('.expects') as HTMLElement;
  const keysEl = host.querySelector('.keys') as HTMLElement;
  const countEl = host.querySelector('.ph-count') as HTMLElement;
  const actions = host.querySelector('.actions') as HTMLElement;
  let open = false;
  let busy = false;
  let noteCount = 0;

  for (let d = 0; d < 8; d++) {
    const btn = document.createElement('button');
    btn.className = 'key ui-btn';
    btn.innerHTML = `<b>${NOTE_NAMES[d]}</b><i>${WORDS[d]}</i>`;
    btn.addEventListener('click', () => cb.onNote(d));
    keysEl.appendChild(btn);
  }
  (host.querySelector('.ask-sample') as HTMLElement).addEventListener('click', () => cb.onSample());
  (host.querySelector('.ask-clear') as HTMLElement).addEventListener('click', () => cb.onClear());
  (host.querySelector('.ask-continue') as HTMLElement).addEventListener('click', () => cb.onContinue());
  (host.querySelector('.ask-close') as HTMLElement).addEventListener('click', () => close());

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
      cb.onClear();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (!busy && noteCount > 0) cb.onContinue();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKey);

  function render(state: AskerState): void {
    busy = state.busy;
    (host.querySelector('.sheet') as HTMLElement).classList.toggle('collapsed', busy);
    noteCount = state.notes.length;
    countEl.textContent = state.notes.length === 0 ? 'no prompt yet' : `${state.notes.length} prompt note${state.notes.length === 1 ? '' : 's'}`;
    strip.innerHTML = '';
    if (state.notes.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = 'play keys, or press Sample';
      strip.appendChild(empty);
    }
    for (const d of state.notes) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `<b>${NOTE_NAMES[d]}</b><i>${WORDS[d]}</i>`;
      strip.appendChild(chip);
    }
    if (busy) {
      expectsEl.textContent = 'the echo is singing…';
    } else if (state.notes.length === 0) {
      expectsEl.textContent = 'the model waits for a prompt';
    } else {
      const top = state.expects.slice(0, 2).map((e) => `"${tokenWord(e.note)}" ${Math.round(e.p * 100)}%`);
      expectsEl.textContent = top.length ? `expects ${top.join(' · ')}` : 'expects nothing yet';
    }
    for (const el of Array.from(actions.querySelectorAll('button'))) {
      (el as HTMLButtonElement).disabled = busy;
    }
    keysEl.classList.toggle('busy', busy);
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

  return { dispose, open: openSheet, close, isOpen: () => open, render };
}
