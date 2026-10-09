import type { Exposition, ExpoDeps } from '../ui/exposition';
import { DEGREE_MIDI, NOTE_NAMES, TransitionModel, mulberry32 } from '../game/music/model';
import type { MusicModel } from '../game/music/model';
import { MlpModel } from '../game/music/mlp';

const PAUSE_MS = 1100;
const CONTINUE_NOTES = 8;

type Mode = 'heart' | 'layer' | 'deep';

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: 'heart', label: 'by heart', blurb: 'It only remembers pairs: after this note, that one.' },
  {
    id: 'layer',
    label: 'one hidden layer',
    blurb:
      'A hidden layer sits between the notes it heard and the notes it expects. It is called hidden because nothing outside ever touches it — not because it is not there.',
  },
  {
    id: 'deep',
    label: 'two hidden layers',
    blurb:
      'Two hidden layers, each one only touching its neighbours. That is all “deep” means: more layers in between.',
  },
];

/** The piano: you play; the model sits on top; then it takes over — for as long as you like. */
export const piano: Exposition = {
  id: 'piano',
  title: 'The piano',
  build(root, say, deps: ExpoDeps) {
    let notes: number[] = [];
    let phase: 'listen' | 'continuing' | 'idle' = 'listen';
    let mode: Mode = 'heart';
    let keepGoing = false;
    let pauseTimer = 0;
    let playTimer = 0;
    let model: MusicModel | null = null;
    let prev: number | null = null;
    let flash: number | null = null;
    let continueCount = 0;
    let showNumbers = false;

    const counts: number[][] = Array.from({ length: 8 }, () => new Array(8).fill(0));

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 300;
    canvas.className = 'piano-model';
    const g = canvas.getContext('2d')!;

    const keys = document.createElement('div');
    keys.className = 'piano-keys';
    const keyEls: HTMLButtonElement[] = [];
    for (let d = 0; d < 8; d++) {
      const b = document.createElement('button');
      b.className = 'ui-btn piano-key';
      b.dataset.note = String(d);
      b.innerHTML = `<b>${NOTE_NAMES[d]}</b>`;
      b.addEventListener('click', () => hit(d));
      keys.appendChild(b);
      keyEls.push(b);
    }

    const ribbon = document.createElement('div');
    ribbon.className = 'piano-ribbon';

    const controls = document.createElement('div');
    controls.className = 'piano-controls';
    const modeRow = document.createElement('div');
    modeRow.className = 'expo-row';
    const runRow = document.createElement('div');
    runRow.className = 'expo-row';
    const forever = document.createElement('button');
    forever.className = 'ui-btn piano-forever';
    const stop = document.createElement('button');
    stop.className = 'ui-btn piano-stop';
    stop.textContent = 'stop';
    const numbers = document.createElement('button');
    numbers.className = 'ui-btn piano-numbers';
    numbers.addEventListener('click', () => {
      showNumbers = !showNumbers;
      renderModes();
      draw();
      say(showNumbers ? 'Numbers on: every value it holds, and the chance it gives each next note.' : 'Numbers off.');
    });
    runRow.append(forever, stop, numbers);
    controls.append(modeRow, runRow);

    root.append(canvas, keys, ribbon, controls);

    function renderModes(): void {
      modeRow.innerHTML = '';
      for (const m of MODES) {
        const b = document.createElement('button');
        b.className = 'ui-btn piano-mode' + (m.id === mode ? ' on' : '');
        b.dataset.mode = m.id;
        b.textContent = m.label;
        b.addEventListener('click', () => setMode(m.id));
        modeRow.appendChild(b);
      }
      forever.textContent = `keep going: ${keepGoing ? 'on' : 'off'}`;
      forever.classList.toggle('on', keepGoing);
      numbers.textContent = `numbers: ${showNumbers ? 'on' : 'off'}`;
      numbers.classList.toggle('on', showNumbers);
      root.dataset.numbers = showNumbers ? 'on' : 'off';
      stop.disabled = phase !== 'continuing';
      root.dataset.mode = mode;
    }

    function setMode(next: Mode): void {
      if (next === mode) return;
      mode = next;
      notes = [];
      for (const row of counts) row.fill(0);
      prev = null;
      flash = null;
      model = null;
      setPhase('listen');
      renderRibbon();
      renderModes();
      draw();
      say(`How it thinks: ${MODES.find((m) => m.id === next)!.label}. ${MODES.find((m) => m.id === next)!.blurb} Play a tune.`);
    }

    function rowY(i: number, rows = 8): number {
      const span = Math.min(260, rows * 30);
      return 30 + (i + 0.5) * (span / rows);
    }

    function label(text: string, x: number, y: number, align: CanvasTextAlign = 'left'): void {
      g.font = '600 13px Georgia, serif';
      g.fillStyle = 'rgba(244,236,216,.7)';
      g.textAlign = align;
      g.fillText(text, x, y);
      g.textAlign = 'left';
    }

    function link(x0: number, y0: number, x1: number, y1: number, alpha: number, sign: number, width: number): void {
      g.strokeStyle = sign >= 0 ? `rgba(217,164,65,${Math.min(0.95, alpha)})` : `rgba(90,127,212,${Math.min(0.95, alpha)})`;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }

    function dot(x: number, y: number, r: number, color: string): void {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
    }

    function drawLookup(): void {
      const leftX = 150;
      const rightX = 570;
      let max = 1;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) max = Math.max(max, counts[i][j]);
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const c = counts[i][j];
          if (c === 0) continue;
          const inUse = i === prev;
          link(leftX, rowY(i), rightX, rowY(j), (inUse ? 0.35 : 0.1) + 0.6 * (c / max), 1, 1 + (c / max) * (inUse ? 5 : 3));
        }
      }
      for (let i = 0; i < 8; i++) {
        dot(leftX, rowY(i), i === prev ? 9 : 6, i === prev ? '#f4ecd8' : '#d9a441');
        dot(rightX, rowY(i), i === flash ? 11 : 6, i === flash ? '#f4ecd8' : 'rgba(111,168,220,.9)');
        label(NOTE_NAMES[i], leftX - 20, rowY(i) + 5, 'right');
        label(NOTE_NAMES[i], rightX + 20, rowY(i) + 5);
      }
      label('what it heard', leftX - 130, 18);
      label('what it expects next', rightX - 30, 18);
      if (showNumbers && prev !== null) {
        const row = counts[prev];
        const total = row.reduce((a, b) => a + b, 0);
        for (let j = 0; j < 8; j++) {
          if (row[j] === 0) continue;
          const x = (leftX + rightX) / 2;
          label(`${row[j]}`, x, rowY(j) + 5, 'center');
          if (total > 0) label(`${Math.round((row[j] / total) * 100)}%`, rightX + 48, rowY(j) + 5);
        }
      }
      root.dataset.transitions = String(counts.flat().reduce((a, b) => a + b, 0));
      root.dataset.depth = '0';
    }

    function drawLayers(): void {
      if (!(model instanceof MlpModel)) return;
      const acts = model.activationsOf(notes.slice(-2));
      const weights = model.weightLayers();
      const cols = weights.length + 1;
      const xs = cols === 3 ? [140, 360, 580] : [120, 300, 480, 660];
      const rowsOf = (col: number) => (col === 0 ? 8 : weights[col - 1].outSize);
      const lit = new Set(notes.slice(-2));

      // links between neighbouring columns
      for (let l = 0; l < weights.length; l++) {
        const layer = weights[l];
        let max = 1e-6;
        for (const v of layer.w) max = Math.max(max, Math.abs(v));
        const outRows = layer.outSize;
        for (let o = 0; o < outRows; o++) {
          for (let i = 0; i < layer.inSize; i++) {
            const w = layer.w[o * layer.inSize + i];
            if (Math.abs(w) < max * 0.25) continue;
            const from = l === 0 ? i % 8 : i;
            link(xs[l], rowY(from, rowsOf(l)), xs[l + 1], rowY(o, rowsOf(l + 1)), 0.08 + 0.6 * (Math.abs(w) / max), w, 1 + (Math.abs(w) / max) * 2.5);
          }
        }
      }
      // a band and a name for every hidden layer, so they read as real
      for (let c = 1; c < cols - 1; c++) {
        const rows = rowsOf(c);
        const top = rowY(0, rows) - 24;
        const bottom = rowY(rows - 1, rows) + 24;
        g.fillStyle = 'rgba(154,143,212,.12)';
        g.fillRect(xs[c] - 44, top, 88, bottom - top);
        g.strokeStyle = 'rgba(154,143,212,.45)';
        g.lineWidth = 1;
        g.strokeRect(xs[c] - 44, top, 88, bottom - top);
        label(`hidden layer ${c}`, xs[c] - 44, 18);
      }

      // nodes
      const probs = model.distribution(notes.slice(-2), 0.8);
      for (let c = 0; c < cols; c++) {
        const rows = rowsOf(c);
        for (let i = 0; i < rows; i++) {
          let color = 'rgba(244,236,216,.25)';
          if (c === 0) {
            color = lit.has(i) ? '#f4ecd8' : '#d9a441';
          } else if (c === cols - 1) {
            color = i === flash ? '#f4ecd8' : `rgba(111,168,220,${0.35 + probs[i] * 0.65})`;
          } else {
            const a = Math.min(1, Math.abs(acts[c][i] ?? 0));
            color = `rgba(154,143,212,${0.25 + a * 0.75})`;
          }
          dot(xs[c], rowY(i, rows), i === flash && c === cols - 1 ? 11 : 6, color);
          if (showNumbers) {
            const x = xs[c];
            const y = rowY(i, rows);
            if (c === cols - 1) {
              label(`${Math.round(probs[i] * 100)}%`, x + 12, y + 5);
            } else if (c === 0) {
              label(`${NOTE_NAMES[i]}`, x - 14, y + 5, 'right');
            } else {
              label(`${(acts[c][i] ?? 0).toFixed(2)}`, x + 12, y + 5);
            }
          }
        }
        if (c === 0) label('what it heard', xs[c] - 60, 18);
        else if (c === cols - 1) label('what it expects next', xs[c] - 90, 18);
      }

      // with the numbers on, name the strongest weights coming from what it just heard
      if (showNumbers && weights.length > 0) {
        const first = weights[0];
        const rowSource = notes[notes.length - 1];
        if (rowSource !== undefined) {
          const entries: { in: number; out: number; w: number }[] = [];
          for (let o = 0; o < first.outSize; o++) {
            for (let i = 0; i < first.inSize; i++) {
              if (i % 8 !== rowSource) continue;
              const w = first.w[o * first.inSize + i];
              entries.push({ in: i, out: o, w });
            }
          }
          entries.sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
          for (const e of entries.slice(0, 4)) {
            label(
              `${e.w >= 0 ? '+' : ''}${e.w.toFixed(2)}`,
              (xs[0] + xs[1]) / 2,
              rowY(e.out, first.outSize) + 5,
              'center',
            );
          }
        }
      }

      root.dataset.depth = String(model.depth);
      root.dataset.transitions = String(model.paramCount);
    }

    function draw(): void {
      g.fillStyle = '#191722';
      g.fillRect(0, 0, canvas.width, canvas.height);
      if (model instanceof MlpModel && mode !== 'heart') drawLayers();
      else drawLookup();
    }

    function notePlayed(degree: number, learn: boolean): void {
      if (learn && prev !== null && mode === 'heart') counts[prev][degree]++;
      prev = degree;
      flash = degree;
      draw();
    }

    function play(degree: number, learn: boolean, dur = 0.55): void {
      deps.playNote(DEGREE_MIDI[degree], 0, dur, 0.85);
      const el = keyEls[degree];
      el.classList.add('on');
      window.setTimeout(() => el.classList.remove('on'), Math.max(120, dur * 800));
      notePlayed(degree, learn);
    }

    function setPhase(p: typeof phase): void {
      phase = p;
      root.dataset.piano = p;
      root.dataset.notes = String(notes.length);
      renderModes();
    }

    function renderRibbon(): void {
      ribbon.textContent = notes.map((d) => NOTE_NAMES[d]).join('  ');
      root.dataset.notes = String(notes.length);
    }

    function stopTimers(clearPause = true): void {
      if (clearPause && pauseTimer) window.clearTimeout(pauseTimer);
      if (playTimer) window.clearInterval(playTimer);
      pauseTimer = 0;
      playTimer = 0;
    }

    function hit(degree: number): void {
      if (phase === 'continuing') return;
      if (phase === 'idle') {
        notes = [];
        for (const row of counts) row.fill(0);
        prev = null;
        flash = null;
      }
      notes.push(degree);
      play(degree, true);
      renderRibbon();
      setPhase('listen');
      say(`${notes.length} note${notes.length === 1 ? '' : 's'} heard. Keep going, or stop — ${mode === 'heart' ? 'the lines below fill in' : 'the layers light up'} as it listens.`);
      if (pauseTimer) window.clearTimeout(pauseTimer);
      pauseTimer = window.setTimeout(takeOver, PAUSE_MS);
    }

    function takeOver(): void {
      if (notes.length < 3) {
        say('Play a few more notes — it needs a little of your tune to learn from.');
        return;
      }
      if (mode === 'heart') {
        const counter = new TransitionModel();
        counter.train(notes);
        model = counter;
      } else {
        const mlp = new MlpModel({ vocab: 8, context: 2, hidden: mode === 'layer' ? [8] : [8, 8] });
        mlp.trainEpochs([notes], mode === 'layer' ? 500 : 700, 0.35);
        model = mlp;
      }
      setPhase('continuing');
      continueCount = 0;
      say(
        mode === 'heart'
          ? 'Listen. It is finishing your tune from the pairs it noticed — nothing else.'
          : `Listen. It is finishing your tune through ${mode === 'layer' ? 'a hidden layer' : 'two hidden layers'} — it learned a pattern, not a lookup.`,
      );
      const rng = mulberry32(7 + notes.length);
      const seq = notes.slice(-2);
      playTimer = window.setInterval(() => {
        const next = model!.sample(seq.slice(-2), 0.8, rng);
        seq.push(next);
        notes.push(next);
        play(next, false);
        renderRibbon();
        continueCount++;
        if (!keepGoing && continueCount >= CONTINUE_NOTES) {
          window.clearInterval(playTimer);
          playTimer = 0;
          setPhase('idle');
          say('That was not your tune replayed. It never heard a tune before yours — it learned what tends to come next. A chatbot does exactly this with words.');
        }
      }, 360);
    }

    function interrupt(): void {
      if (phase !== 'continuing') return;
      stopTimers(false);
      setPhase('idle');
      say('Stopped. Play again, or switch how it thinks.');
    }

    const onKey = (e: KeyboardEvent) => {
      const m = /^(?:Digit|Numpad)([1-8])$/.exec(e.code);
      if (m) {
        e.preventDefault();
        hit(Number(m[1]) - 1);
      } else if (e.code === 'Space' && phase === 'continuing') {
        e.preventDefault();
        interrupt();
      }
    };
    window.addEventListener('keydown', onKey);
    forever.addEventListener('click', () => {
      keepGoing = !keepGoing;
      renderModes();
      say(keepGoing ? 'It will keep going until you stop it.' : 'It will stop after eight notes.');
    });
    stop.addEventListener('click', interrupt);

    setPhase('listen');
    renderRibbon();
    renderModes();
    draw();
    say('Hum a little tune on the keys, then stop. Above them you can watch how it thinks.');

    return {
      dispose() {
        stopTimers();
        window.removeEventListener('keydown', onKey);
      },
    };
  },
};
