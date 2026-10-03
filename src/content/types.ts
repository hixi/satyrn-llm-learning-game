export type Condition =
  | { event: 'mechanic.completed'; mechanic?: string; world?: string }
  | { event: 'world.entered'; world?: string }
  | { event: 'world.skipped'; world?: string }
  | { event: 'world.engineRoom.completed'; world?: string }
  | { event: 'evidence.submitted'; mechanic?: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface Concept {
  id: string;
  term: string;
  short: string;
  body: string;
  related: string[];
}

export interface Character {
  id: string;
  name: string;
  title?: string;
  description: string;
}

export interface Mechanic {
  id: string;
  title: string;
  description: string;
  a11y: string;
  params: Record<string, unknown>;
}

export interface EngineRoom {
  title: string;
  body: string;
  mechanic?: string;
}

export type Act = 'prologue' | 'act1' | 'act2' | 'act3';

export interface World {
  id: string;
  title: string;
  act: Act;
  order: number;
  keeper?: string;
  dialogue?: string;
  concepts: string[];
  mechanic: string;
  summary: string;
  intro: string;
  engineRoom?: EngineRoom;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  kind: 'lesson' | 'skip' | 'depth' | 'journey';
  condition?: Condition;
  predicate?: string;
}

export interface DialogueChoice {
  id: string;
  text: string;
  next?: string;
  condition?: Condition;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices: DialogueChoice[];
}

export interface Dialogue {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

export interface Thread {
  id: string;
  title: string;
  sequence: string[];
}

export interface Strings {
  id: string;
  title: string;
  values: Record<string, string>;
}

export interface Content {
  concepts: Record<string, Concept>;
  characters: Record<string, Character>;
  worlds: Record<string, World>;
  mechanics: Record<string, Mechanic>;
  achievements: Record<string, Achievement>;
  dialogues: Record<string, Dialogue>;
  threads: Record<string, Thread>;
  strings: Record<string, Strings>;
}

export interface DanglingRef {
  from: string;
  field: string;
  target: string;
}

export interface ScenarioProblem {
  mechanic: string;
  problem: string;
}

export interface ContentDiagnostics {
  dangling: DanglingRef[];
  scenarioProblems: ScenarioProblem[];
}
