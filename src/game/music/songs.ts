import { TransitionModel } from './model';
import type { Song } from './model';

export { type SerializedModel } from './model';

/** Public-domain tunes, quantised to the eight-note vocabulary. */
export const SONGS: Song[] = [
  {
    id: 'ode',
    name: 'Ode to Joy',
    tempo: 120,
    notes: [
      [2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1],
      [0, 1], [0, 1], [1, 1], [2, 1], [2, 1.5], [1, 0.5], [1, 2],
    ],
  },
  {
    id: 'twinkle',
    name: 'Twinkle, Twinkle',
    tempo: 120,
    notes: [
      [0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2],
      [3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2],
    ],
  },
  {
    id: 'frere',
    name: 'Frère Jacques',
    tempo: 120,
    notes: [
      [0, 1], [1, 1], [2, 1], [0, 1], [0, 1], [1, 1], [2, 1], [0, 1],
      [2, 1], [3, 1], [4, 2], [2, 1], [3, 1], [4, 2],
    ],
  },
];

/** The model "arrived already trained" on the songs above. */
export function buildPretrained(): TransitionModel {
  const model = new TransitionModel();
  for (const song of SONGS) model.train(song.notes.map((n) => n[0]));
  return model;
}
