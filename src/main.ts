import './style.css';
import { content } from './content/content';
import { Store } from './store/store';
import { SoundBank } from './game/audio';
import { announce } from './game/announce';
import { parseHash } from './router';
import { renderHud, renderJournal, renderMap, renderNotFound, renderTitle } from './views/shell';
import { renderWorld } from './views/world';
import { watchAchievements } from './ui/toast';

const store = new Store({ achievements: Object.values(content.achievements) });
const sounds = new SoundBank();
sounds.setEnabled(store.getState().settings.soundOn);

const app = document.getElementById('app')!;
const hud = document.createElement('header');
const main = document.createElement('main');
app.append(hud, main);

const ctx = { store, sounds };

function render(): void {
  renderHud(hud, store, sounds);
  renderNow();
}

function renderNow(): void {
  const route = parseHash(window.location.hash);
  main.innerHTML = '';
  if (route.name === 'world') {
    if (!store.getState().seenPrologue) {
      renderTitle(main, store);
      announce('The Thread. Walk the prologue first.');
      return;
    }
    renderWorld(main, ctx, store, route.worldId);
    const world = content.worlds[route.worldId];
    announce(world ? `${world.title}. ${world.summary}` : 'Unknown Bead.');
  } else if (route.name === 'journal') {
    renderJournal(main, store);
    announce("The Moon's Memory. Journey. Cards. Honors. Keepsake.");
  } else if (route.name === 'notFound') {
    renderNotFound(main, route.path);
    announce('That path is not on the Thread.');
  } else {
    if (!store.getState().seenPrologue) {
      renderTitle(main, store);
      const heading = main.querySelector('h2')?.textContent ?? 'The Thread';
      announce(`${heading}.`);
      return;
    }
    renderMap(main, store);
    const mode = store.getState().mode;
    announce(mode === 'thread' ? 'The Thread. 10 beads.' : 'All the Beads.');
  }
}

watchAchievements(store, (id) => content.achievements[id]?.title ?? id);
// HUD stays live on every store event. Main re-renders only on navigation,
// an act-card dismissal, a mode switch on the map, or a null event
// (import/reset) — never on mechanic progress, so in-progress picks,
// dialogue nodes and journal tabs survive.
store.subscribe((_, event) => {
  renderHud(hud, store, sounds);
  if (!event) {
    renderNow();
    return;
  }
  if (event.type === 'actCard.seen') {
    const route = parseHash(window.location.hash);
    if (route.name === 'map') renderNow();
    return;
  }
  if (event.type === 'mode.changed') {
    const route = parseHash(window.location.hash);
    if (route.name === 'map') renderNow();
  }
});
window.addEventListener('hashchange', render);
render();
