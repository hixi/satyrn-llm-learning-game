import { announce } from '../game/announce';
import type { Store } from '../store/store';

let stack: HTMLElement | null = null;

function getStack(): HTMLElement {
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-hidden', 'true');
    document.body.appendChild(stack);
  }
  return stack;
}

export function toast(text: string): void {
  announce(text);
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  const host = getStack();
  host.appendChild(el);
  while (host.children.length > 3) host.firstChild?.remove();
  setTimeout(() => el.remove(), 2500);
}

export function watchAchievements(store: Store, getTitle: (id: string) => string): () => void {
  let last: readonly string[] = [...store.getState().achievements];
  return store.subscribe((state) => {
    const fresh = state.achievements.filter((id) => !last.includes(id));
    last = [...state.achievements];
    for (const id of fresh) toast(`Honor earned: ${getTitle(id)}.`);
  });
}
