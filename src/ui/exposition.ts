export interface ExpoDeps {
  playNote(midi: number, when?: number, dur?: number, velocity?: number): void;
}

export interface Exposition {
  id: string;
  /** Short name, shown small while you use the object. */
  title: string;
  /** Builds the object. `say` writes the single line under it. */
  build(root: HTMLElement, say: (text: string) => void, deps: ExpoDeps): { dispose(): void };
}

export interface ExpositionHost {
  open(page: Exposition): void;
  close(): void;
  isOpen(): boolean;
  current(): string | null;
}

/**
 * The zoom: one object, big, on a mostly empty screen. Nothing else —
 * no text walls, no menus. One line explains what just happened.
 */
export function buildExpositionHost(onOpenChange: (open: boolean) => void, deps: ExpoDeps): ExpositionHost {
  const host = document.createElement('div');
  host.id = 'expo-host';
  host.innerHTML = [
    '<div id="expo" hidden>',
    '<div id="expo-panel">',
    '<div id="expo-head"><span id="expo-title"></span><button id="expo-close" class="ui-btn">step back</button></div>',
    '<div id="expo-say"></div>',
    '<div id="expo-stage"></div>',
    '</div>',
    '</div>',
  ].join('');
  document.getElementById('ui')!.appendChild(host);

  const overlay = host.querySelector('#expo') as HTMLElement;
  const titleEl = host.querySelector('#expo-title') as HTMLElement;
  const stageEl = host.querySelector('#expo-stage') as HTMLElement;
  const sayEl = host.querySelector('#expo-say') as HTMLElement;
  let current: Exposition | null = null;
  let mounted: { dispose(): void } | null = null;

  const say = (text: string) => {
    sayEl.textContent = text;
    sayEl.classList.remove('flash');
    void sayEl.offsetWidth;
    sayEl.classList.add('flash');
  };

  (host.querySelector('#expo-close') as HTMLElement).addEventListener('click', () => close());
  const onKey = (e: KeyboardEvent) => {
    if (current && e.code === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKey);

  function open(page: Exposition): void {
    if (mounted) mounted.dispose();
    stageEl.innerHTML = '';
    current = page;
    titleEl.textContent = page.title;
    sayEl.textContent = '';
    mounted = page.build(stageEl, say, deps);
    overlay.hidden = false;
    (overlay.querySelector('#expo-panel') as HTMLElement).scrollTop = 0;
    onOpenChange(true);
  }

  function close(): void {
    if (!current) return;
    if (mounted) mounted.dispose();
    mounted = null;
    current = null;
    overlay.hidden = true;
    stageEl.innerHTML = '';
    onOpenChange(false);
  }

  return { open, close, isOpen: () => current !== null, current: () => current?.id ?? null };
}
