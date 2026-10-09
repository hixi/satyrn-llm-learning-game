import type { Exposition } from '../ui/exposition';

const MAX_SIZE = 10;
const UNIT = 0.1; // sizes are read as 0.1 .. 1.0

/**
 * Does it fit? A ball above a hole. The machine calls it before the drop;
 * nobody tells it the rule — it works out for itself that the ball counts
 * against and the hole counts for. The perceptron sits on top, weights and all.
 */
export const fit: Exposition = {
  id: 'fit',
  title: 'Does it fit?',
  build(root, say) {
    let ballSize = 3;
    let holeSize = 5;
    let wBall = -0.35;
    let wHole = 0.35;
    let need = 0; // bias, shown as "how much it needs"
    let phase: 'guess' | 'reveal' = 'guess';
    let fits = false;
    let said = false;
    let copied = 0;
    let streak = 0;
    let best = 0;
    let lastLabel: boolean | null = null;
    let auto = false;
    let autoRight = 0;
    let autoTotal = 0;
    let nextTimer = 0;
    let autoTimer = 0;

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 400;
    canvas.className = 'fit-model';
    const g = canvas.getContext('2d')!;

    const controls = document.createElement('div');
    controls.className = 'fit-controls';
    const call = document.createElement('div');
    call.className = 'fit-call';
    const row = document.createElement('div');
    row.className = 'expo-row';
    const fitsBtn = document.createElement('button');
    fitsBtn.className = 'ui-btn fit-in primary';
    fitsBtn.textContent = 'I say it fits';
    const noFitBtn = document.createElement('button');
    noFitBtn.className = 'ui-btn fit-out';
    noFitBtn.textContent = 'I say it does not fit';
    const autoBtn = document.createElement('button');
    autoBtn.className = 'ui-btn fit-auto';
    row.append(fitsBtn, noFitBtn, autoBtn);
    const score = document.createElement('div');
    score.className = 'fit-score';
    controls.append(call, row, score);
    root.append(canvas, controls);

    const x = (size: number) => size * UNIT;
    const ballR = () => 8 + ballSize * 2.6;
    const holeR = () => 8 + holeSize * 2.6;

    function wouldSayFits(): boolean {
      return wBall * x(ballSize) + wHole * x(holeSize) + need >= 0;
    }

    const word = (text: string, px: number, py: number, size = 14, color = 'rgba(244,236,216,.85)', align: CanvasTextAlign = 'left') => {
      g.font = `600 ${size}px Georgia, serif`;
      g.fillStyle = color;
      g.textAlign = align;
      g.fillText(text, px, py);
      g.textAlign = 'left';
    };

    function bar(px: number, py: number, width: number, value: number, color: string, label: string, valueText?: string): void {
      g.fillStyle = 'rgba(244,236,216,.13)';
      g.fillRect(px, py, width, 13);
      g.fillStyle = color;
      g.fillRect(px, py, width * Math.max(0, Math.min(1, Math.abs(value))), 13);
      word(label, px, py - 7, 13, 'rgba(244,236,216,.7)');
      if (valueText !== undefined) word(valueText, px + width + 8, py + 11, 13, color);
    }

    function drawNet(): void {
      word('the machine', 60, 26, 15, '#f4ecd8');
      word('what it sees', 220, 26, 13, 'rgba(244,236,216,.65)');
      word('how much it counts', 390, 26, 13, 'rgba(244,236,216,.65)');
      bar(220, 48, 130, ballSize / MAX_SIZE, '#9ab0ff', 'ball');
      bar(220, 118, 130, holeSize / MAX_SIZE, '#9ab0ff', 'hole');
      bar(390, 48, 70, Math.abs(wBall) / 1.5, wBall >= 0 ? '#d9a441' : '#5a7fd4', '', `${wBall >= 0 ? '+' : ''}${wBall.toFixed(1)}`);
      bar(390, 118, 70, Math.abs(wHole) / 1.5, wHole >= 0 ? '#d9a441' : '#5a7fd4', '', `${wHole >= 0 ? '+' : ''}${wHole.toFixed(1)}`);
      // links into the lamp
      for (const [py, w] of [
        [54, wBall],
        [124, wHole],
      ] as [number, number][]) {
        g.strokeStyle = w >= 0 ? 'rgba(217,164,65,.75)' : 'rgba(90,127,212,.75)';
        g.lineWidth = 1 + Math.min(4, Math.abs(w) * 3);
        g.beginPath();
        g.moveTo(470, py);
        g.lineTo(600, 96);
        g.stroke();
      }
      // how much it needs
      bar(500, 150, 130, Math.min(1, Math.max(0, need + 0.5)), '#9ab0ff', 'how much it needs');
      // the lamp
      g.beginPath();
      g.arc(634, 92, 30, 0, Math.PI * 2);
      g.fillStyle = said ? 'rgba(127,176,105,.92)' : 'rgba(200,90,80,.92)';
      g.fill();
      g.strokeStyle = '#f4ecd8';
      g.lineWidth = 3;
      g.stroke();
      word(said ? 'it fits' : 'it does not fit', 634, 140, 15, '#f4ecd8', 'center');
    }

    function drawDrop(): void {
      const plateY = 322;
      const cx = 300;
      // the plate with a hole
      g.fillStyle = phase === 'reveal' ? 'rgba(180,170,150,.9)' : 'rgba(150,142,126,.9)';
      g.beginPath();
      g.rect(cx - 130, plateY, 260, 16);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(cx, plateY + 8, holeR(), 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      g.beginPath();
      g.arc(cx, plateY + 8, holeR(), Math.PI, 0);
      g.strokeStyle = 'rgba(244,236,216,.5)';
      g.lineWidth = 3;
      g.stroke();
      word('the hole', cx, plateY + 44, 13, 'rgba(244,236,216,.6)', 'center');

      const resting = plateY - ballR();
      const fallY = phase === 'reveal' && fits ? plateY + 90 : resting;
      g.globalAlpha = phase === 'reveal' && fits ? 0.55 : 1;
      g.beginPath();
      g.arc(cx, fallY, ballR(), 0, Math.PI * 2);
      g.fillStyle = '#8a7f6a';
      g.fill();
      g.strokeStyle = '#f4ecd8';
      g.lineWidth = 3;
      g.stroke();
      g.globalAlpha = 1;
      word('the ball', cx, resting - ballR() - 12, 13, 'rgba(244,236,216,.6)', 'center');

      if (phase === 'reveal') {
        word(fits ? 'it dropped through' : 'it sat on top', cx, 372, 15, fits ? '#9fd69f' : '#e6827a', 'center');
        word(said === fits ? 'you both called it' : '', cx, 392, 13, 'rgba(244,236,216,.55)', 'center');
      }

      root.dataset.phase = phase;
      root.dataset.ball = String(ballSize);
      root.dataset.hole = String(holeSize);
      root.dataset.wBall = wBall.toFixed(2);
      root.dataset.wHole = wHole.toFixed(2);
      root.dataset.need = need.toFixed(2);
      root.dataset.said = said ? 'fits' : 'no';
      root.dataset.streak = String(streak);
      root.dataset.best = String(best);
      root.dataset.label = lastLabel === null ? 'none' : lastLabel ? 'fits' : 'no';
      root.dataset.copied = String(copied);
    }

    function draw(): void {
      g.fillStyle = '#191722';
      g.fillRect(0, 0, canvas.width, canvas.height);
      drawNet();
      drawDrop();
    }

    function renderScore(): void {
      score.textContent = auto
        ? `on its own: ${autoRight} right of ${autoTotal}`
        : `it copies you: ${streak} in a row (best ${best}) · ${copied} times so far`;
      autoBtn.textContent = auto ? 'teach it again' : 'let it run on its own';
      autoBtn.classList.toggle('on', auto);
      root.dataset.auto = auto ? 'on' : 'off';
      root.dataset.autoRight = String(autoRight);
      root.dataset.autoTotal = String(autoTotal);
    }

    function setPhase(p: typeof phase): void {
      phase = p;
      fitsBtn.disabled = auto || phase !== 'guess';
      noFitBtn.disabled = auto || phase !== 'guess';
    }

    function next(): void {
      if (nextTimer) window.clearTimeout(nextTimer);
      nextTimer = 0;
      ballSize = 1 + Math.floor(Math.random() * MAX_SIZE);
      holeSize = 1 + Math.floor(Math.random() * MAX_SIZE);
      fits = false;
      lastLabel = null;
      said = wouldSayFits();
      setPhase('guess');
      call.textContent = `It thinks ${said ? 'it fits' : 'it does not fit'}. What do you say?`;
      call.classList.remove('right', 'wrong');
      renderScore();
      draw();
      if (auto) {
        if (autoTimer) window.clearTimeout(autoTimer);
        autoTimer = window.setTimeout(() => runAlone(), 900);
      }
    }

    /** Training is done: it calls the next one by itself, and the ball drops. */
    function runAlone(): void {
      if (!auto || phase !== 'guess') return;
      fits = ballSize < holeSize;
      said = wouldSayFits();
      autoTotal++;
      if (said === fits) autoRight++;
      setPhase('reveal');
      call.textContent = `It says ${said ? 'it fits' : 'it does not fit'} — and it ${fits ? 'fit' : 'did not fit'}.`;
      call.classList.toggle('right', said === fits);
      call.classList.toggle('wrong', said !== fits);
      say(
        said === fits
          ? 'That is what you taught it.'
          : 'That is also what you taught it — the mistakes included.',
      );
      renderScore();
      draw();
      nextTimer = window.setTimeout(next, auto ? 1300 : 2300);
    }

    /** The player teaches. The ball drops as you say it, and it learns your answer — true or not. */
    function teach(label: boolean): void {
      if (phase !== 'guess') return;
      lastLabel = label;
      fits = ballSize < holeSize;
      said = wouldSayFits();
      const worldSays = fits;
      if (said === label) {
        streak++;
        best = Math.max(best, streak);
      } else {
        streak = 0;
      }
      copied++;
      // it learns the player's answer, not the world's
      const err = (label ? 1 : 0) - (said ? 1 : 0);
      if (err !== 0) {
        wBall += 0.5 * err * x(ballSize);
        wHole += 0.5 * err * x(holeSize);
        need += 0.5 * err;
      }
      setPhase('reveal');
      call.classList.toggle('right', label === worldSays);
      call.classList.toggle('wrong', label !== worldSays);
      if (label !== worldSays) {
        call.textContent = `You said ${label ? 'it fits' : 'it does not fit'} — but it ${worldSays ? 'fit' : 'did not fit'}.`;
        say('The world says otherwise, and it believes you anyway. It learns what you teach it, not what is true.');
      } else if (said === label) {
        call.textContent = `You said ${label ? 'it fits' : 'it does not fit'} — and it was so. It already agreed with you.`;
        say(`It copies you. ${streak} in a row.`);
      } else {
        call.textContent = `You said ${label ? 'it fits' : 'it does not fit'} — and it was so. Its dials move toward your answer.`;
        say('Watch its two dials shift: that is it learning your answer.');
      }
      renderScore();
      draw();
      nextTimer = window.setTimeout(next, 2300);
    }

    // drag the ball or the hole to hunt for the moment it becomes unsure
    let drag: 'ball' | 'hole' | null = null;
    let fromY = 0;
    let fromSize = 0;
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const cx = 300;
      if (phase === 'guess' && Math.hypot(px - cx, py - (360 - ballR())) < ballR() + 14) {
        drag = 'ball';
        fromSize = ballSize;
      } else if (px > cx - 140 && px < cx + 140 && py > 300 && py < 360) {
        drag = 'hole';
        fromSize = holeSize;
      } else {
        return;
      }
      fromY = py;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const rect = canvas.getBoundingClientRect();
      const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const steps = Math.round((fromY - py) / 26);
      if (drag === 'ball') ballSize = Math.max(1, Math.min(MAX_SIZE, fromSize + steps));
      else holeSize = Math.max(1, Math.min(MAX_SIZE, fromSize + steps));
      if (phase === 'guess') said = wouldSayFits();
      draw();
    };
    const onUp = () => {
      if (!drag) return;
      drag = null;
      if (phase === 'guess') {
        said = wouldSayFits();
        call.textContent = `Its call: ${said ? 'fits' : 'does not fit'}. Drop the ball and see.`;
        draw();
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    fitsBtn.addEventListener('click', () => teach(true));
    noFitBtn.addEventListener('click', () => teach(false));
    autoBtn.addEventListener('click', () => {
      auto = !auto;
      if (autoTimer) window.clearTimeout(autoTimer);
      if (nextTimer) window.clearTimeout(nextTimer);
      autoRight = 0;
      autoTotal = 0;
      if (auto) {
        call.textContent = 'Training is done. It runs on its own now.';
        say('Watch it work alone — it will do exactly what you taught it, mistakes and all.');
      } else {
        say('Your turn again: say whether each one fits.');
      }
      next();
    });

    next();
    say('You are the teacher: say whether each one fits. The ball drops as you say it — and it copies whatever you say, right or wrong.');

    return {
      dispose() {
        if (nextTimer) window.clearTimeout(nextTimer);
        if (autoTimer) window.clearTimeout(autoTimer);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
      },
    };
  },
};
