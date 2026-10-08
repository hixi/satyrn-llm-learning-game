import type { HelpPage } from '../game/help';

export interface HelpHandle {
  open(page: HelpPage): void;
  close(): void;
  isOpen(): boolean;
  dispose(): void;
}

/** Scrollable in-world reference: opens a paper sheet over the hall. */
export function buildHelp(onOpenChange: (open: boolean) => void): HelpHandle {
  const host = document.createElement('div');
  host.id = 'help-host';
  host.innerHTML = [
    '<div id="help" hidden>',
    '<div id="help-panel">',
    '<h2 id="help-title">Help</h2>',
    '<p id="help-intro"></p>',
    '<div class="help-body" id="help-body"></div>',
    '<div class="help-foot"><span class="help-hint">scroll for more · Esc to close</span>',
    '<button class="ui-btn" id="help-close">Close</button></div>',
    '</div>',
    '</div>',
  ].join('');
  document.getElementById('ui')!.appendChild(host);

  const overlay = host.querySelector('#help') as HTMLElement;
  const titleEl = host.querySelector('#help-title') as HTMLElement;
  const introEl = host.querySelector('#help-intro') as HTMLElement;
  const bodyEl = host.querySelector('#help-body') as HTMLElement;
  let open = false;

  (host.querySelector('#help-close') as HTMLElement).addEventListener('click', () => close());
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });
  const onKey = (e: KeyboardEvent) => {
    if (open && e.code === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKey);

  function openPage(page: HelpPage): void {
    titleEl.textContent = page.title;
    introEl.textContent = page.intro;
    bodyEl.innerHTML = '';
    for (const section of page.sections) {
      const h = document.createElement('h3');
      h.textContent = section.heading;
      bodyEl.appendChild(h);
      for (const line of section.lines) {
        const p = document.createElement('p');
        if (line.startsWith('• ')) {
          p.className = 'bullet';
          p.textContent = line.slice(2);
        } else {
          p.textContent = line;
        }
        bodyEl.appendChild(p);
      }
    }
    bodyEl.scrollTop = 0;
    overlay.hidden = false;
    open = true;
    onOpenChange(true);
  }

  function close(): void {
    if (!open) return;
    overlay.hidden = true;
    open = false;
    onOpenChange(false);
  }


  function dispose(): void {
    window.removeEventListener('keydown', onKey);
    host.remove();
  }

  return { dispose, open: openPage, close, isOpen: () => open };
}
