import type { ScenarioValidator } from './scenario-helpers';
import { validateScenario as lantern } from './lantern/logic';
import { validateScenario as rainGauge } from './rain-gauge/logic';
import { validateScenario as aviary } from './aviary/logic';
import { validateScenario as cartwright } from './cartwright/logic';
import { validateScenario as roundPath } from './round-path/logic';
import { validateScenario as gate } from './gate/logic';
import { validateScenario as assayer } from './assayer/logic';
import { validateScenario as blueprint } from './blueprint/logic';
import { validateScenario as well } from './well/logic';
import { validateScenario as garden } from './garden/logic';

export const SCENARIO_VALIDATORS: Record<string, ScenarioValidator> = {
  'mechanic.lantern': lantern,
  'mechanic.rain-gauge': rainGauge,
  'mechanic.aviary': aviary,
  'mechanic.cartwright': cartwright,
  'mechanic.round-path': roundPath,
  'mechanic.gate-of-orders': gate,
  'mechanic.assayers-scale': assayer,
  'mechanic.blueprint': blueprint,
  'mechanic.well-and-pipe': well,
  'mechanic.commons-garden': garden,
};
