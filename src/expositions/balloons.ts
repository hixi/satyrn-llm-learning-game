import type { Exposition } from '../ui/exposition';
import { timeScale } from '../game/time';

const COLOURS = [
  { name: 'red', hex: '#e06c5a' },
  { name: 'blue', hex: '#6fa8dc' },
  { name: 'green', hex: '#7fb069' },
  { name: 'yellow', hex: '#e0c04a' },
  { name: 'purple', hex: '#9a8fd4' },
];
const N = COLOURS.length;
const RISE = 6.5; // seconds for a balloon to cross the frame
const GAP = 0.9; // seconds between balloons
const AUTO_DELAY = 1.2;

interface Machine {
  colour: number;
  big: number;
  need: number;
}
interface Balloon {
  colour: number;
  big: boolean;
  x: number;
  y: number;
  resolved: 'none' | 'burst' | 'kept';
}

/** The balloon study: burst what you dislike, keep the rest — five little machines learn your taste. */
export const balloons: Exposition = {
  id: 'balloons',
  title: 'The balloon study',
  build(root, say) {
    let machines: Machine[] = Array.from({ length: N }, () => ({ colour: 0, big: 0, need: 0 }));
    let yourKept = new Array(N).fill(0);
    let itsKept = new Array(N).fill(0);
    let bursts = 0;
    let itsBursts = 0;
    let auto = false;
    let paused = false;
    let balloon: Balloon | null = null;
    let last = performance.now();
    let raf = 0;
    let spawnAt = 0;
    let autoActAt = 0;
    let burstAt = 0;

    // ————— the model, on screen —————
    const cards = document.createElement('div');
    cards.className = 'bm-row';
    const cardEls: {
      root: HTMLElement;
      bars: HTMLElement[];
      values: HTMLElement[];
      call: HTMLElement;
    }[] = [];
    for (let i = 0; i < N; i++) {
      const card = document.createElement('div');
      card.className = 'bm-card';
      card.dataset.colour = String(i);
      const head = document.createElement('div');
      head.className = 'bm-head';
      const dot = document.createElement('span');
      dot.className = 'bm-dot';
      dot.style.background = COLOURS[i].hex;
      const name = document.createElement('span');
      name.textContent = COLOURS[i].name;
      const call = document.createElement('span');
      call.className = 'bm-call';
      head.append(dot, name, call);
      card.appendChild(head);
      const bars: HTMLElement[] = [];
      const values: HTMLElement[] = [];
      for (const label of ['likes this colour', 'likes big ones', 'needs this much']) {
        const row = document.createElement('div');
        row.className = 'bm-line';
        const l = document.createElement('span');
        l.className = 'bm-label';
        l.textContent = label;
        const track = document.createElement('span');
        track.className = 'bm-track';
        const fill = document.createElement('span');
        fill.className = 'bm-fill';
        track.appendChild(fill);
        const v = document.createElement('span');
        v.className = 'bm-value';
        row.append(l, track, v);
        card.appendChild(row);
        bars.push(fill);
        values.push(v);
      }
      cards.appendChild(card);
      cardEls.push({ root: card, bars, values, call });
    }

    const diagram = document.createElement('canvas');
    diagram.width = 720;
    diagram.height = 240;
    diagram.className = 'balloons-diagram';
    const dg = diagram.getContext('2d')!;
    let showDiagram = true;

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 320;
    canvas.className = 'balloons-model';
    const g = canvas.getContext('2d')!;

    const controls = document.createElement('div');
    controls.className = 'balloons-controls';
    const line = document.createElement('div');
    line.className = 'balloons-call';
    const row = document.createElement('div');
    row.className = 'expo-row';
    const popBtn = document.createElement('button');
    popBtn.className = 'ui-btn balloons-pop';
    popBtn.textContent = 'pop this one';
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'ui-btn balloons-pause';
    const playBtn = document.createElement('button');
    playBtn.className = 'ui-btn balloons-play';
    const againBtn = document.createElement('button');
    againBtn.className = 'ui-btn balloons-again';
    againBtn.textContent = 'start again';
    const showBtn = document.createElement('button');
    showBtn.className = 'ui-btn balloons-show';
    row.append(popBtn, pauseBtn, playBtn, againBtn, showBtn);
    const score = document.createElement('div');
    score.className = 'balloons-score';
    controls.append(line, row, score);
    root.append(cards, diagram, canvas, controls);

    const call = (m: Machine, big: boolean) => m.colour + m.big * (big ? 1 : 0) + m.need >= 0;

    function renderModel(): void {
      for (let i = 0; i < N; i++) {
        const m = machines[i];
        const els = cardEls[i];
        const vals = [m.colour, m.big, m.need];
        vals.forEach((v, k) => {
          els.bars[k].style.width = `${Math.min(100, (Math.abs(v) / 2) * 100)}%`;
          els.bars[k].style.background = v >= 0 ? '#d9a441' : '#5a7fd4';
          els.values[k].textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
        });
        const keep = balloon && balloon.colour === i ? call(m, balloon.big) : m.colour >= 0;
        els.call.textContent = keep ? 'keep' : 'burst';
        els.call.classList.toggle('burst', !keep);
      }
    }

    function drawDiagram(): void {
      dg.fillStyle = '#191722';
      dg.fillRect(0, 0, diagram.width, diagram.height);
      const inX = 96;
      const outX = 560;
      const rowY = (i: number) => 26 + i * 34;
      const bigY = rowY(N) + 6;
      const active = balloon ? balloon.colour : -1;

      // what it sees: one detector per colour, plus one for big
      for (let i = 0; i < N; i++) {
        const lit = active === i;
        dg.beginPath();
        dg.arc(inX, rowY(i), lit ? 11 : 7, 0, Math.PI * 2);
        dg.fillStyle = lit ? COLOURS[i].hex : `${COLOURS[i].hex}66`;
        dg.fill();
        dg.font = '600 12px Georgia, serif';
        dg.fillStyle = 'rgba(244,236,216,.75)';
        dg.fillText(`is it ${COLOURS[i].name}?`, 16, rowY(i) + 4);
      }
      const bigLit = !!(balloon && balloon.big);
      dg.beginPath();
      dg.arc(inX, bigY, bigLit ? 11 : 7, 0, Math.PI * 2);
      dg.fillStyle = bigLit ? '#f4ecd8' : 'rgba(244,236,216,.4)';
      dg.fill();
      dg.fillStyle = 'rgba(244,236,216,.75)';
      dg.fillText('is it big?', 16, bigY + 4);

      // the five machines, one per colour
      for (let i = 0; i < N; i++) {
        const m = machines[i];
        const keep = call(m, balloon ? balloon.big : false);
        const edges: [number, number, number][] = [
          [inX, rowY(i), m.colour],
          [inX, bigY, m.big],
        ];
        for (const [fx, fy, w] of edges) {
          const mag = Math.min(1, Math.abs(w) / 2);
          dg.strokeStyle = w >= 0 ? `rgba(217,164,65,${0.12 + mag * 0.8})` : `rgba(90,127,212,${0.12 + mag * 0.8})`;
          dg.lineWidth = 1 + mag * 5;
          dg.beginPath();
          dg.moveTo(fx, fy);
          dg.lineTo(outX - 14, rowY(i));
          dg.stroke();
        }
        dg.beginPath();
        dg.arc(outX, rowY(i), active === i ? 13 : 9, 0, Math.PI * 2);
        dg.fillStyle = keep ? 'rgba(127,176,105,.9)' : 'rgba(200,90,80,.9)';
        dg.fill();
        if (active === i) {
          dg.strokeStyle = '#f4ecd8';
          dg.lineWidth = 3;
          dg.stroke();
        }
        dg.font = '600 12px Georgia, serif';
        dg.fillStyle = 'rgba(244,236,216,.75)';
        dg.fillText(`${COLOURS[i].name}'s machine · ${keep ? 'keep' : 'burst'}`, outX + 22, rowY(i) + 4);
      }
      dg.font = '600 12px Georgia, serif';
      dg.fillStyle = 'rgba(244,236,216,.55)';
      dg.fillText('what it sees', 16, 12);
      dg.fillText('one machine per colour', outX - 40, 12);
      root.dataset.model = showDiagram ? 'diagram' : 'numbers';
    }

    function draw(): void {
      g.fillStyle = '#191722';
      g.fillRect(0, 0, canvas.width, canvas.height);
      const top = 12;
      const bottom = 308;
      g.strokeStyle = 'rgba(244,236,216,.22)';
      g.lineWidth = 2;
      g.strokeRect(16, top, 688, bottom - top);
      // the piles: yours in gold, its in blue
      for (let i = 0; i < N; i++) {
        const x = 80 + i * 140;
        let y = top + 12;
        for (let k = 0; k < yourKept[i]; k++) {
          g.fillStyle = '#d9a441';
          g.fillRect(x - 18, y, 36, 9);
          y += 11;
        }
        for (let k = 0; k < itsKept[i]; k++) {
          g.fillStyle = '#6fa8dc';
          g.fillRect(x - 18, y, 36, 9);
          y += 11;
        }
        g.font = '600 13px Georgia, serif';
        g.fillStyle = COLOURS[i].hex;
        g.textAlign = 'center';
        g.fillText(COLOURS[i].name, x, top - 2 + 12);
        g.textAlign = 'left';
      }
      if (balloon) {
        const r = balloon.big ? 30 : 20;
        g.beginPath();
        g.ellipse(balloon.x, balloon.y, r, r * 1.12, 0, 0, Math.PI * 2);
        g.fillStyle = balloon.resolved === 'burst' ? 'rgba(244,236,216,.2)' : COLOURS[balloon.colour].hex;
        g.fill();
        g.strokeStyle = 'rgba(244,236,216,.55)';
        g.lineWidth = 2;
        g.stroke();
        g.beginPath();
        g.moveTo(balloon.x, balloon.y + r * 1.12);
        g.lineTo(balloon.x + 5, balloon.y + r * 1.12 + 16);
        g.stroke();
      }
      if (auto) {
        g.beginPath();
        g.arc(46, bottom - 22, 12, 0, Math.PI * 2);
        g.fillStyle = '#9a8fd4';
        g.fill();
      }
      if (paused) {
        g.font = '600 20px Georgia, serif';
        g.fillStyle = 'rgba(244,236,216,.85)';
        g.textAlign = 'center';
        g.fillText('paused', canvas.width / 2, 60);
        g.textAlign = 'left';
      }
      root.dataset.balloons = balloon
        ? `${Math.round(balloon.x)},${Math.round(balloon.y)},${balloon.colour},${balloon.big ? 'big' : 'small'}`
        : 'none';
      root.dataset.auto = auto ? 'on' : 'off';
      root.dataset.paused = paused ? 'on' : 'off';
      root.dataset.bursts = String(bursts);
      root.dataset.itsBursts = String(itsBursts);
      root.dataset.kept = yourKept.join(',');
      root.dataset.itsKept = itsKept.join(',');
      root.dataset.colourWeights = machines.map((m) => m.colour.toFixed(2)).join(',');
      root.dataset.bigWeights = machines.map((m) => m.big.toFixed(2)).join(',');
      renderModel();
      drawDiagram();
    }

    function renderScore(): void {
      const yourTotal = yourKept.reduce((a, b) => a + b, 0);
      const itsTotal = itsKept.reduce((a, b) => a + b, 0);
      score.textContent = auto
        ? `it kept ${itsTotal} · it burst ${itsBursts}`
        : `you kept ${yourTotal} · you burst ${bursts}`;
      playBtn.textContent = auto ? 'stop it' : 'let the model play for you';
      playBtn.classList.toggle('on', auto);
      pauseBtn.textContent = paused ? 'let them rise' : 'pause';
      pauseBtn.classList.toggle('on', paused);
      popBtn.disabled = auto || paused || !balloon || balloon.resolved !== 'none';
      showBtn.textContent = showDiagram ? 'show the numbers' : 'show the machine';
      cards.hidden = showDiagram;
      diagram.hidden = !showDiagram;
    }

    function learn(colour: number, big: boolean, target: number): void {
      const m = machines[colour];
      const err = target - (call(m, big) ? 1 : 0);
      if (err === 0) return;
      m.colour += 0.4 * err;
      m.big += 0.4 * err * (big ? 1 : 0);
      m.need += 0.4 * err;
    }

    function resolve(res: 'burst' | 'kept', owner: 'you' | 'it'): void {
      if (!balloon || balloon.resolved !== 'none') return;
      balloon.resolved = res;
      if (res === 'burst') {
        if (owner === 'you') {
          bursts++;
          learn(balloon.colour, balloon.big, 0);
          say(`Burst. Its ${COLOURS[balloon.colour].name} machine turns against ${COLOURS[balloon.colour].name}.`);
        } else itsBursts++;
      } else if (owner === 'you') {
        yourKept[balloon.colour]++;
        learn(balloon.colour, balloon.big, 1);
        say(`Kept. Its ${COLOURS[balloon.colour].name} machine warms to ${COLOURS[balloon.colour].name}.`);
      } else {
        itsKept[balloon.colour]++;
      }
      burstAt = performance.now();
      spawnAt = performance.now() + GAP * 1000;
      renderScore();
      draw();
    }

    function spawn(): void {
      balloon = {
        colour: Math.floor(Math.random() * N),
        big: Math.random() < 0.5,
        x: 80 + Math.floor(Math.random() * N) * 140 + (Math.random() * 24 - 12),
        y: 300,
        resolved: 'none',
      };
      autoActAt = auto ? performance.now() + AUTO_DELAY * 1000 : 0;
      renderScore();
      draw();
    }

    function popThisOne(): void {
      if (auto || paused || !balloon || balloon.resolved !== 'none') return;
      resolve('burst', 'you');
    }

    function onPointerDown(e: PointerEvent): void {
      if (auto || paused || !balloon || balloon.resolved !== 'none') return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (Math.hypot(x - balloon.x, y - balloon.y) < (balloon.big ? 40 : 30)) resolve('burst', 'you');
    }
    canvas.addEventListener('pointerdown', onPointerDown);

    function tick(now: number): void {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (paused) return;
      if (!balloon && now >= spawnAt) {
        spawn();
        return;
      }
      if (!balloon) return;
      const speed = 290 / (RISE / timeScale());
      balloon.y -= speed * dt;
      if (auto && balloon.resolved === 'none' && now >= autoActAt) {
        if (call(machines[balloon.colour], balloon.big)) resolve('kept', 'it');
        else resolve('burst', 'it');
        return;
      }
      if (balloon.resolved === 'kept') {
        balloon.y -= speed * 2 * dt;
        if (balloon.y < 30) {
          balloon = null;
          renderScore();
          draw();
        }
      } else if (balloon.resolved === 'burst') {
        if (now - burstAt > 180) {
          balloon = null;
          renderScore();
          draw();
        }
      } else if (balloon.y < 40) {
        resolve('kept', 'you');
      }
      draw();
    }
    raf = requestAnimationFrame(tick);

    popBtn.addEventListener('click', () => popThisOne());
    showBtn.addEventListener('click', () => {
      showDiagram = !showDiagram;
      renderScore();
      draw();
    });
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      say(paused ? 'Paused — take your time.' : 'Off they go again.');
      renderScore();
      draw();
    });
    playBtn.addEventListener('click', () => {
      auto = !auto;
      paused = false;
      say(auto ? 'It plays on its own now. Stop whenever you want to teach it more.' : 'Your turn again.');
      renderScore();
      draw();
    });
    againBtn.addEventListener('click', () => {
      machines = Array.from({ length: N }, () => ({ colour: 0, big: 0, need: 0 }));
      yourKept = new Array(N).fill(0);
      itsKept = new Array(N).fill(0);
      bursts = 0;
      itsBursts = 0;
      balloon = null;
      paused = false;
      spawnAt = performance.now() + 300;
      say('A clean slate: five machines that know nothing, and empty piles.');
      renderScore();
      draw();
    });

    spawnAt = performance.now() + 300;
    renderScore();
    draw();
    say('Burst the balloons you dislike; the rest float up and are kept. Five little machines are watching, one per colour.');

    return {
      dispose() {
        cancelAnimationFrame(raf);
        canvas.removeEventListener('pointerdown', onPointerDown);
      },
    };
  },
};
