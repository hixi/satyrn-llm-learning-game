import type { Exposition, ExpoDeps } from '../ui/exposition';
import { DEGREE_MIDI, NOTE_NAMES, REST, TransitionModel, mulberry32 } from '../game/music/model';
import type { MusicModel } from '../game/music/model';
import { MlpModel } from '../game/music/mlp';
import { SONGS } from '../game/music/songs';
import { timeScale } from '../game/time';

const PAUSE_MS = 1100;
const CONTINUE_NOTES = 8;
const NOISE = 0.05; // a little randomness, so it can wander out of a loop

type Mode = 'heart' | 'layer' | 'deep' | 'expanded' | 'song' | 'words';

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
    blurb: 'Two hidden layers, each one only touching its neighbours. That is all “deep” means: more layers in between.',
  },
  {
    id: 'song',
    label: 'learn a real song',
    blurb:
      'An old tune, learned in front of you on two or three hidden layers. It plays the whole time, so you hear it go from nonsense to the song.',
  },
  {
    id: 'words',
    label: 'words (a tiny story)',
    blurb:
      'Each key is a word instead of a note. Play a few words and it learns which word tends to follow which — then it writes the next ones back. This is what a chatbot is, with a handful of words instead of billions.',
  },
  {
    id: 'expanded',
    label: 'expanded: layers + pauses',
    blurb:
      'Three hidden layers, and now it remembers the gaps too. The pause key drops a rest into the tune, and it can put one back when it takes over.',
  },
];

const STORY_WORDS = ['the', 'cat', 'dog', 'saw', 'ran', 'sat', 'on', 'a', 'mat', 'and', 'then', 'big'];

const hiddenFor = (mode: Mode): number[] =>
  mode === 'layer' ? [8] : mode === 'deep' ? [8, 8] : mode === 'expanded' ? [8, 8, 8] : mode === 'words' ? [16, 16] : [];
const epochsFor = (mode: Mode): number => (mode === 'layer' ? 500 : mode === 'deep' ? 700 : mode === 'words' ? 800 : 900);
const vocabFor = (mode: Mode): number => (mode === 'expanded' ? REST + 1 : mode === 'words' ? STORY_WORDS.length : NOTE_NAMES.length);

/** The piano: you play; the model sits on top; then it takes over — for as long as you like. */
export const piano: Exposition = {
  id: 'piano',
  title: 'The piano',
  build(root, say, deps: ExpoDeps) {
    let notes: number[] = [];
    let phase: 'listen' | 'continuing' | 'idle' = 'listen';
    let mode: Mode = 'heart';
    let keepGoing = false;
    let showNumbers = false;
    let pauseTimer = 0;
    let playTimer = 0;
    let model: MusicModel | null = null;
    let prev: number | null = null;
    let flash: number | null = null;
    let continueCount = 0;
    let songIdx = 0;
    let songLayers = 2;
    let learning = false;
    let learnPass = 0;
    let learnSample: number[] = [];
    let learnIdx = 0;
    let learnModel: MlpModel | null = null;
    let playedTotal = 0;

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
    const restKey = document.createElement('button');
    restKey.className = 'ui-btn piano-key piano-rest';
    restKey.dataset.note = String(REST);
    restKey.innerHTML = `<b>·</b><i>pause</i>`;
    restKey.addEventListener('click', () => hit(REST));
    keys.appendChild(restKey);
    const wordEls: HTMLButtonElement[] = [];
    for (let i = 0; i < STORY_WORDS.length; i++) {
      const b = document.createElement('button');
      b.className = 'ui-btn piano-key piano-word';
      b.dataset.note = String(i);
      b.innerHTML = `<b>${STORY_WORDS[i]}</b>`;
      b.addEventListener('click', () => hit(i));
      keys.appendChild(b);
      wordEls.push(b);
    }

    const ribbon = document.createElement('div');
    ribbon.className = 'piano-ribbon';

    const controls = document.createElement('div');
    controls.className = 'piano-controls';
    const modeRow = document.createElement('div');
    modeRow.className = 'expo-row';
    const songRow = document.createElement('div');
    songRow.className = 'expo-row piano-songrow';
    const songList = document.createElement('div');
    songList.className = 'piano-songlist';
    SONGS.forEach((song, i) => {
      const b = document.createElement('button');
      b.className = 'ui-btn piano-song';
      b.dataset.song = song.id;
      b.textContent = song.name;
      b.addEventListener('click', () => startSong(i));
      songList.appendChild(b);
    });
    const layersBtn = document.createElement('button');
    layersBtn.className = 'ui-btn piano-layers';
    layersBtn.addEventListener('click', () => {
      songLayers = songLayers === 2 ? 3 : 2;
      if (mode === 'song') startSong(songIdx);
      else renderModes();
    });
    const hearBtn = document.createElement('button');
    hearBtn.className = 'ui-btn piano-hear';
    hearBtn.textContent = 'hear the real tune';
    hearBtn.addEventListener('click', () => playRealSong());
    songRow.append(songList, layersBtn, hearBtn);
    const runRow = document.createElement('div');
    runRow.className = 'expo-row';
    const forever = document.createElement('button');
    forever.className = 'ui-btn piano-forever';
    const stop = document.createElement('button');
    stop.className = 'ui-btn piano-stop';
    stop.textContent = 'stop';
    const numbers = document.createElement('button');
    numbers.className = 'ui-btn piano-numbers';
    runRow.append(forever, stop, numbers);
    controls.append(modeRow, songRow, runRow);

    root.append(canvas, keys, ribbon, controls);

    const tokensOf = () => vocabFor(mode);
    const labelFor = (i: number) =>
      mode === 'words' ? (STORY_WORDS[i] ?? '') : i < NOTE_NAMES.length ? NOTE_NAMES[i] : '·';

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
      stop.disabled = playTimer === 0;
      const wordsMode = mode === 'words';
      keyEls.forEach((el) => (el.hidden = wordsMode));
      wordEls.forEach((el) => (el.hidden = !wordsMode));
      restKey.hidden = wordsMode || mode !== 'expanded';
      songRow.hidden = mode !== 'song';
      keys.hidden = mode === 'song';
      layersBtn.textContent = `layers: ${songLayers}`;
      root.dataset.mode = mode;
      root.dataset.song = SONGS[songIdx].id;
      root.dataset.learning = learning ? 'on' : 'off';
      root.dataset.pass = String(learnPass);
      root.dataset.played = String(playedTotal);
      if (mode === 'song') root.dataset.depth = String(songLayers);
      root.dataset.vocab = String(tokensOf());
      root.dataset.noise = mode === 'heart' ? 'off' : 'on';
      root.dataset.numbers = showNumbers ? 'on' : 'off';
      root.dataset.timer = playTimer !== 0 ? 'on' : 'off';
    }

    function setMode(next: Mode): void {
      stopTimers();
      playedTotal = 0;
      learning = false;
      learnSample = [];
      learnIdx = 0;
      mode = next;
      notes = [];
      for (const row of counts) row.fill(0);
      prev = null;
      flash = null;
      model = null;
      continueCount = 0;
      setPhase('listen');
      renderRibbon();
      renderModes();
      draw();
      const m = MODES.find((x) => x.id === next)!;
      say(`How it thinks: ${m.label}. ${m.blurb} Play a tune.`);
    }

    function rowY(i: number, rows: number): number {
      const span = Math.min(258, rows * 30);
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

    function dot(x: number, y: number, r: number, colour: string): void {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = colour;
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
          link(leftX, rowY(i, 8), rightX, rowY(j, 8), (inUse ? 0.35 : 0.1) + 0.6 * (c / max), 1, 1 + (c / max) * (inUse ? 5 : 3));
        }
      }
      for (let i = 0; i < 8; i++) {
        dot(leftX, rowY(i, 8), i === prev ? 9 : 6, i === prev ? '#f4ecd8' : '#d9a441');
        dot(rightX, rowY(i, 8), i === flash ? 11 : 6, i === flash ? '#f4ecd8' : 'rgba(111,168,220,.9)');
        label(NOTE_NAMES[i], leftX - 20, rowY(i, 8) + 5, 'right');
        label(NOTE_NAMES[i], rightX + 20, rowY(i, 8) + 5);
      }
      label('what it heard', leftX - 130, 18);
      label('what it expects next', rightX - 30, 18);
      if (showNumbers && prev !== null) {
        const row = counts[prev];
        const total = row.reduce((a, b) => a + b, 0);
        for (let j = 0; j < 8; j++) {
          if (row[j] === 0) continue;
          label(`${row[j]}`, (leftX + rightX) / 2, rowY(j, 8) + 5, 'center');
          if (total > 0) label(`${Math.round((row[j] / total) * 100)}%`, rightX + 48, rowY(j, 8) + 5);
        }
      }
      root.dataset.transitions = String(counts.flat().reduce((a, b) => a + b, 0));
      root.dataset.depth = '0';
    }

    function drawLayers(): void {
      if (!(model instanceof MlpModel)) return;
      const V = model.config.vocab;
      const acts = model.activationsOf(notes.slice(-2));
      const weights = model.weightLayers();
      const cols = weights.length + 1;
      const xs = cols === 4 ? [120, 300, 480, 660] : cols === 3 ? [140, 360, 580] : [120, 260, 400, 540, 660];
      const rowsOf = (col: number) => (col === 0 ? V : weights[col - 1].outSize);
      const lit = new Set(notes.slice(-2));

      for (let l = 0; l < weights.length; l++) {
        const layer = weights[l];
        let max = 1e-6;
        for (const v of layer.w) max = Math.max(max, Math.abs(v));
        for (let o = 0; o < layer.outSize; o++) {
          for (let i = 0; i < layer.inSize; i++) {
            const w = layer.w[o * layer.inSize + i];
            if (Math.abs(w) < max * 0.25) continue;
            const from = l === 0 ? i % V : i;
            link(xs[l], rowY(from, rowsOf(l)), xs[l + 1], rowY(o, rowsOf(l + 1)), 0.08 + 0.6 * (Math.abs(w) / max), w, 1 + (Math.abs(w) / max) * 2.5);
          }
        }
      }
      const probs = model.distribution(notes.slice(-2), 0.8);
      for (let c = 0; c < cols; c++) {
        const rows = rowsOf(c);
        for (let i = 0; i < rows; i++) {
          let colour = 'rgba(244,236,216,.25)';
          if (c === 0) {
            colour = lit.has(i) ? '#f4ecd8' : '#d9a441';
          } else if (c === cols - 1) {
            colour = i === flash ? '#f4ecd8' : `rgba(111,168,220,${0.35 + (probs[i] ?? 0) * 0.65})`;
          } else {
            const a = Math.min(1, Math.abs(acts[c][i] ?? 0));
            colour = `rgba(154,143,212,${0.25 + a * 0.75})`;
          }
          dot(xs[c], rowY(i, rows), i === flash && c === cols - 1 ? 11 : 6, colour);
          if (showNumbers) {
            if (c === 0) label(labelFor(i), xs[c] - 14, rowY(i, rows) + 5, 'right');
            else if (c === cols - 1) label(`${Math.round((probs[i] ?? 0) * 100)}%`, xs[c] + 12, rowY(i, rows) + 5);
            else label(`${(acts[c][i] ?? 0).toFixed(2)}`, xs[c] + 12, rowY(i, rows) + 5);
          }
        }
        if (c === 0) label('what it heard', xs[c] - 60, 18);
        else if (c === cols - 1) label('what it expects next', xs[c] - 90, 18);
        else label(`hidden layer ${c}`, xs[c] - 44, 18);
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

    function notePlayed(token: number, learn: boolean): void {
      if (learn && prev !== null && mode === 'heart' && token < 8 && prev < 8) counts[prev][token]++;
      prev = token;
      flash = token;
      draw();
    }

    function play(token: number, learn: boolean, dur = 0.55): void {
      playedTotal++;
      const el = mode === 'words' ? wordEls[token] : token < NOTE_NAMES.length ? keyEls[token] : null;
      if (token < DEGREE_MIDI.length) deps.playNote(DEGREE_MIDI[token], 0, dur, 0.85);
      if (el) {
        el.classList.add('on');
        window.setTimeout(() => el.classList.remove('on'), Math.max(120, dur * 800));
      }
      notePlayed(token, learn);
    }

    function setPhase(p: typeof phase): void {
      phase = p;
      root.dataset.piano = p;
      root.dataset.notes = String(notes.length);
      renderModes();
    }

    function renderRibbon(): void {
      ribbon.textContent = notes.map((t) => labelFor(t)).join('  ');
      root.dataset.notes = String(notes.length);
    }

    function stopTimers(): void {
      if (pauseTimer) window.clearTimeout(pauseTimer);
      if (playTimer) window.clearInterval(playTimer);
      pauseTimer = 0;
      playTimer = 0;
    }

    function hit(token: number): void {
      if (mode === 'song') return;
      if (phase === 'continuing') return;
      if (token === REST && mode !== 'expanded') return;
      if (phase === 'idle') {
        notes = [];
        for (const row of counts) row.fill(0);
        prev = null;
        flash = null;
      }
      notes.push(token);
      play(token, true, token === REST ? 0.2 : 0.55);
      renderRibbon();
      setPhase('listen');
      say(`${notes.length} step${notes.length === 1 ? '' : 's'} heard. Keep going, or stop — ${mode === 'heart' ? 'the lines fill in' : 'the layers light up'} as it listens.`);
      if (pauseTimer) window.clearTimeout(pauseTimer);
      pauseTimer = window.setTimeout(takeOver, PAUSE_MS);
    }

    function takeOver(): void {
      if (notes.length < 3) {
        say('Play a few more notes — it needs a little of your tune to learn from.');
        return;
      }
      const V = tokensOf();
      if (mode === 'heart') {
        const counter = new TransitionModel();
        counter.train(notes.filter((t) => t < 8));
        model = counter;
      } else {
        const mlp = new MlpModel({ vocab: V, context: 2, hidden: hiddenFor(mode) });
        mlp.trainEpochs([notes], epochsFor(mode), 0.3);
        model = mlp;
      }
      continueCount = 0;
      setPhase('continuing');
      const rng = mulberry32(7 + notes.length);
      const seq = notes.slice(-2);
      const modeLine =
        mode === 'heart'
          ? 'from the pairs it noticed'
          : mode === 'words'
            ? 'word by word, with two big hidden layers'
            : mode === 'expanded'
              ? `through three hidden layers, pauses and all`
              : `through ${mode === 'layer' ? 'a hidden layer' : 'two hidden layers'}`;
      say(`Listen. It is finishing your tune ${modeLine}.`);
      playTimer = window.setInterval(() => {
        const context = seq.slice(-2);
        let next: number;
        if (mode === 'heart' || !(model instanceof MlpModel)) {
          next = model!.sample(context, 0.8, rng);
        } else {
          // a little noise, so a strong habit or a loop can be broken
          const p = model.distribution(context, 0.8);
          const noisy = p.map((v) => (1 - NOISE) * v + NOISE / p.length);
          let r = rng();
          next = noisy.length - 1;
          for (let i = 0; i < noisy.length; i++) {
            r -= noisy[i];
            if (r <= 0) {
              next = i;
              break;
            }
          }
        }
        seq.push(next);
        notes.push(next);
        play(next, false, next === REST ? 0.2 : 0.5);
        renderRibbon();
        continueCount++;
        if (!keepGoing && continueCount >= CONTINUE_NOTES) stopContinuing(true);
      }, beatMs());
      renderModes();
    }

    const beatMs = () => Math.max(80, 360 / timeScale());

    function sampleTokens(m: MlpModel, seed: number[], count: number, temp: number): number[] {
      const out = seed.slice();
      const rng = mulberry32(11 + learnPass * 7 + count);
      for (let i = 0; i < count; i++) {
        const p = m.distribution(out.slice(-2), temp);
        const noisy = p.map((v) => (1 - NOISE) * v + NOISE / p.length);
        let r = rng();
        let tok = noisy.length - 1;
        for (let k = 0; k < noisy.length; k++) {
          r -= noisy[k];
          if (r <= 0) {
            tok = k;
            break;
          }
        }
        out.push(tok);
      }
      return out.slice(seed.length);
    }

    function startSong(idx: number): void {
      stopTimers();
      songIdx = idx;
      learnModel = new MlpModel({ vocab: 8, context: 2, hidden: Array.from({ length: songLayers }, () => 8) });
      model = learnModel;
      learnPass = 0;
      learnSample = [];
      learnIdx = 0;
      learning = true;
      notes = [];
      prev = null;
      flash = null;
      setPhase('continuing');
      setModeButtons();
      say(`Learning “${SONGS[idx].name}” on ${songLayers} hidden layers. Listen — it plays while it learns.`);
      playTimer = window.setInterval(songTick, beatMs());
    }

    function songTick(): void {
      if (!learning || !(learnModel instanceof MlpModel)) return;
      if (learnIdx >= learnSample.length) {
        learnModel.trainEpochs([SONGS[songIdx].notes.map((n) => n[0])], 40, 0.3);
        learnPass++;
        learnSample = sampleTokens(learnModel, SONGS[songIdx].notes.map((n) => n[0]).slice(0, 2), 12, 0.6);
        learnIdx = 0;
        notes = [];
        if (learnPass === 8) say('It knows the tune now — and it goes on playing what it learned until you stop it.');
      }
      const tok = learnSample[learnIdx++];
      notes.push(tok);
      play(tok, false);
      renderRibbon();
      draw();
      renderModes();
    }

    function playRealSong(): void {
      stopTimers();
      learning = false;
      const song = SONGS[songIdx];
      const tokens = song.notes.map((n) => n[0]);
      let i = 0;
      notes = [];
      setPhase('continuing');
      renderModes();
      playTimer = window.setInterval(() => {
        if (i >= tokens.length) {
          stopContinuing(false);
          say(`That was “${song.name}” — the real tune, note for note.`);
          return;
        }
        const tok = tokens[i++];
        notes.push(tok);
        play(tok, false);
        renderRibbon();
        draw();
      }, beatMs());
    }

    function setModeButtons(): void {
      for (const b of Array.from(modeRow.querySelectorAll('.piano-mode'))) {
        const el = b as HTMLButtonElement;
        el.classList.toggle('on', el.dataset.mode === mode);
      }
    }

    function stopContinuing(finished: boolean): void {
      stopTimers();
      learning = false;
      learnSample = [];
      learnIdx = 0;
      setPhase('idle');
      renderModes();
      if (finished) {
        say(
          mode === 'words'
            ? 'It never learned grammar — it learned which word tends to follow which. That is what a chatbot does, at a size we cannot draw.'
            : mode === 'expanded'
            ? 'That was not your tune replayed — three layers, and it remembered the gaps as well as the notes. A chatbot does this with words.'
            : 'That was not your tune replayed. It never heard a tune before yours — it learned what tends to come next. A chatbot does exactly this with words.',
        );
      } else {
        say('Stopped. Play again, or switch how it thinks.');
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const m = /^(?:Digit|Numpad)([1-8])$/.exec(e.code);
      if (m) {
        e.preventDefault();
        hit(Number(m[1]) - 1);
      } else if (e.code === 'Digit0' || e.code === 'KeyP') {
        e.preventDefault();
        hit(REST);
      } else if (e.code === 'Space' && playTimer !== 0) {
        e.preventDefault();
        stopContinuing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    forever.addEventListener('click', () => {
      keepGoing = !keepGoing;
      renderModes();
      say(keepGoing ? 'It will keep going until you stop it.' : 'It will stop after eight steps.');
    });
    stop.addEventListener('click', () => stopContinuing(false));
    numbers.addEventListener('click', () => {
      showNumbers = !showNumbers;
      renderModes();
      draw();
      say(showNumbers ? 'Numbers on: every value it holds, and the chance it gives each next step.' : 'Numbers off.');
    });

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
