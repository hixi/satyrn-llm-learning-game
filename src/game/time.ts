const KEY = 'satyrn25d.time.v1';

export const SPEEDS = [1, 0.5, 0.25, 0.1];
let idx = 0;

try {
  const raw = localStorage.getItem(KEY);
  const n = raw === null ? NaN : Number(raw);
  if (Number.isFinite(n) && n >= 0 && n < SPEEDS.length) idx = n;
} catch {
  /* default speed */
}

/** Multiplier applied to learning and inference timing: 1 = full speed, 0.1 = very slow. */
export function timeScale(): number {
  return SPEEDS[idx];
}

export function timeLabel(): string {
  return `${SPEEDS[idx]}×`;
}

export function cycleTime(): string {
  idx = (idx + 1) % SPEEDS.length;
  try {
    localStorage.setItem(KEY, String(idx));
  } catch {
    /* not persisted */
  }
  return timeLabel();
}
