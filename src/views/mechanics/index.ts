import type { Ctx } from '../../ui/mechanic-helpers';
import { renderLantern } from './lantern';
import { renderRainGauge } from './rain-gauge';
import { renderAviary } from './aviary';
import { renderCartwright } from './cartwright';
import { renderRoundPath } from './round-path';
import { renderGate } from './gate';
import { renderAssayer } from './assayer';
import { renderBlueprint } from './blueprint';
import { renderWell } from './well';
import { renderGarden } from './garden';
import { el } from '../../ui/mechanic-helpers';

const RENDERERS: Record<string, (host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown) => void> = {
  'mechanic.lantern': renderLantern,
  'mechanic.rain-gauge': renderRainGauge,
  'mechanic.aviary': renderAviary,
  'mechanic.cartwright': renderCartwright,
  'mechanic.round-path': renderRoundPath,
  'mechanic.gate-of-orders': renderGate,
  'mechanic.assayers-scale': renderAssayer,
  'mechanic.blueprint': renderBlueprint,
  'mechanic.well-and-pipe': renderWell,
  'mechanic.commons-garden': renderGarden,
};

export function renderMechanic(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const box = document.createElement('div');
  host.appendChild(box);
  const render = RENDERERS[mechanicId];
  if (!render) {
    box.appendChild(el('p', 'This mechanic is not installed — you can continue.'));
    return;
  }
  render(box, ctx, worldId, mechanicId, params);
}
