import { chromium } from 'playwright-core';

const exe = '/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

const fails = [];
function check(name, cond, detail = '') {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (cond ? '' : ' — ' + detail));
  if (!cond) fails.push(name);
}
const probe = () => page.evaluate(() => window.__satyrn.probe());
async function prompt() {
  await page.waitForTimeout(420);
  return page.evaluate(() => {
    const el = document.getElementById('prompt');
    if (!el || !el.classList.contains('visible')) return '';
    return el.textContent?.replace(/\s*E$/, '') ?? '';
  });
}
const readPrompt = () =>
  page.evaluate(() => {
    const el = document.getElementById('prompt');
    if (!el || !el.classList.contains('visible')) return '';
    return el.textContent?.replace(/\s*E$/, '') ?? '';
  });
async function interactAt(x, z, yaw, ms = 500) {
  await page.evaluate(([tx, tz, ty]) => window.__satyrn.teleport(tx, tz, ty), [x, z, yaw]);
  await page.waitForTimeout(350);
  let label = '';
  for (let i = 0; i < 10; i++) {
    label = await readPrompt();
    if (label) break;
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(ms);
  return label;
}
async function walk(moved = 0.6) {
  const before = (await probe()).pos;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(750);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(180);
  const after = (await probe()).pos;
  return Math.hypot(after[0] - before[0], after[2] - before[2]) > moved;
}
async function until(checkFn, maxMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await checkFn()) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

await page.goto('http://localhost:4599/#hub', { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/kilo/shot-1-hub.png' });
let p = await probe();
check('hub boot', p && p.keepsakes === 0, JSON.stringify(p));
const timeBefore = (await probe()).time;
await page.click('#time-btn');
await page.waitForTimeout(200);
const timeAfter = (await probe()).time;
check('time control cycles', timeBefore !== timeAfter, `${timeBefore} -> ${timeAfter}`);
for (let i = 0; i < 3; i++) {
  await page.click('#time-btn');
  await page.waitForTimeout(80);
}
p = await probe();
check('time back to full speed', p.time === '1×', p.time);

// occlusion ghost + walkability at the hub spawn
await page.evaluate(() => window.__satyrn.teleport(16, -8, 0));
await page.waitForTimeout(700);
p = await probe();
check('occluders ghost', p.ghosted > 0, `ghosted=${p.ghosted}`);
await page.screenshot({ path: '/tmp/kilo/shot-0-ghost.png' });
await page.evaluate(() => window.__satyrn.teleport(0, 6.5, Math.PI));
await page.waitForTimeout(200);
check('hub spawn can walk', await walk(0.5));

// ————— Training Hall —————
check('training door', (await interactAt(-7.3, -1.9, -Math.PI / 2)) === 'Enter the Training Hall', await prompt());
await page.waitForTimeout(1200);
check('routed to training', page.url().includes('#training.door'), page.url());
p = await probe();
check(
  'training starts empty',
  p.source === 'preset' && p.models === 2 && p.notes === 0 && p.method === 'counter',
  JSON.stringify(p),
);
check('training spawn can walk', await walk(0.6));

check('training help', (await interactAt(-2.8, 2.9, 0)).startsWith('Help'), await prompt());
let helpOpen = await page.evaluate(() => !document.getElementById('help').hidden);
let helpScroll = await page.evaluate(() => {
  const el = document.getElementById('help-body');
  return !!el && el.scrollHeight > el.clientHeight + 4;
});
let helpText = await page.evaluate(() => document.getElementById('help-panel')?.textContent ?? '');
check('training help opens', helpOpen && helpText.includes('Train'), `${helpOpen} ${helpText.slice(0, 40)}`);
check('training help scrolls', helpScroll, String(helpScroll));
await page.screenshot({ path: '/tmp/kilo/shot-10-help.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('help closes', await page.evaluate(() => document.getElementById('help').hidden), 'still open');

const caption = await page.evaluate(() => document.getElementById('caption')?.textContent ?? '');
check('notebook caption', caption.includes('Step 1') && caption.includes('notebook'), caption);

// compose a phrase, train the counter
check('open notebook', (await interactAt(3.4, 1.9, 0, 700)) === '1 · Open the notebook', await prompt());
const sheetVisible = await page.evaluate(() => !(document.querySelector('.composer')?.hasAttribute('hidden') ?? true));
check('notebook visible', sheetVisible);
await page.keyboard.press('Digit1');
await page.keyboard.press('Digit1');
await page.keyboard.press('Backspace');
await page.waitForTimeout(150);
p = await probe();
check('undo works', p.phrases[0] === 1, JSON.stringify(p.phrases));
for (const key of ['Digit1', 'Digit5', 'Digit5', 'Digit6', 'Digit6', 'Digit5', 'Digit4']) {
  await page.keyboard.press(key);
  await page.waitForTimeout(60);
}
p = await probe();
check('phrase composed', p.phrases[0] === 8 && p.notes === 8, JSON.stringify(p.phrases));

await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('step starts a paused run', (await interactAt(0, 1.9, 0)) === 'Step through learning', await prompt());
p = await probe();
check(
  'learning paused',
  p.busy === true && p.paused === true && p.trainKind === 'counter' && p.step === 0 && p.total === 7,
  JSON.stringify({ busy: p.busy, paused: p.paused, step: p.step, total: p.total }),
);
await interactAt(0, 1.9, 0);
p = await probe();
check('one step advances', p.step === 1, JSON.stringify(p.step));
await page.screenshot({ path: '/tmp/kilo/shot-8-training.png' });
check('resume from the lever', (await interactAt(-3.4, 1.9, 0)).startsWith('2 · Train'), await prompt());
const finished = await until(async () => !(await probe()).busy, 10000);
p = await probe();
check(
  'counter model registered',
  finished && p.trainedNow === true && p.models === 3 && p.model === 'Model 1' && p.size.includes('transition'),
  JSON.stringify(p),
);

check('open notebook again', (await interactAt(3.4, 1.9, 0, 700)) === '1 · Open the notebook', await prompt());
const routeBefore = page.url();
await page.evaluate(() => window.__satyrn.teleport(0, 4.7, 0));
await page.waitForTimeout(200);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
check('notebook blocks world interaction', page.url() === routeBefore, page.url());
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// train a real network on the same phrase
check('switch method', (await interactAt(2.8, 2.9, 0)) === 'Method: counter', await prompt());
p = await probe();
check('method is network', p.method === 'network', JSON.stringify(p.method));
check('open notebook again', (await interactAt(3.4, 1.9, 0, 700)) === '1 · Open the notebook', await prompt());
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
p = await probe();
check('network training runs', p.busy === true && p.trainKind === 'network', JSON.stringify({ busy: p.busy, epochs: p.epochs }));
const netDone = await until(async () => !(await probe()).busy, 25000);
p = await probe();
check('network trained', netDone && p.epochs === 320, JSON.stringify({ epochs: p.epochs }));
check('network overfits small data', typeof p.loss === 'number' && p.loss < 0.3, String(p.loss));
await page.screenshot({ path: '/tmp/kilo/shot-12-network.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
p = await probe();
check('network model registered', p.models === 4 && p.modelKind === 'network' && p.model === 'Model 2', JSON.stringify(p));

check('keepsake prompt', (await interactAt(-6.0, -2.4, 0)) === 'Take the First Model', await prompt());
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
p = await probe();
check('first model keepsake', p.keepsakes === 1 && p.journal === 1, JSON.stringify(p));
check('leave training', (await interactAt(0, 4.7, 0)) === 'Return to the clearing', await prompt());
await page.waitForTimeout(900);

// ————— Echo Hall —————
check('echo door', (await interactAt(7.3, -1.9, Math.PI / 2)) === 'Enter the Echo Hall', await prompt());
await page.waitForTimeout(1200);
check('routed to echo', page.url().includes('#echo.door'), page.url());
check('echo spawn can walk', await walk(0.6));
check('echo help', (await interactAt(-2.8, 1.6, 0)).startsWith('Help'), await prompt());
helpText = await page.evaluate(() => document.getElementById('help-panel')?.textContent ?? '');
helpOpen = await page.evaluate(() => !document.getElementById('help').hidden);
check('echo help explains inference', helpOpen && helpText.includes('inference'), `${helpOpen} ${helpText.slice(0, 40)}`);
await page.screenshot({ path: '/tmp/kilo/shot-11-echo-help.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

p = await probe();
check(
  'echo loads your network',
  p.modelName === 'Model 2' && p.kind === 'network' && p.panel === 'network' && p.models === 4,
  JSON.stringify(p),
);
check('no prompt yet', Array.isArray(p.promptNotes) && p.promptNotes.length === 0 && p.keysOpen === false, JSON.stringify(p));

// the model stand cycles kinds; the drawn panel follows
await interactAt(-6.3, 2.6, 0);
p = await probe();
check('loads the old songs', p.modelName === 'The Old Songs' && p.kind === 'counter' && p.panel === 'counter', JSON.stringify(p));
await interactAt(-6.3, 2.6, 0);
p = await probe();
check(
  'old songs available as a network',
  p.modelName === 'The Old Songs (network)' && p.kind === 'network' && p.panel === 'network',
  JSON.stringify(p),
);
await interactAt(-6.3, 2.6, 0);
p = await probe();
check('loads the first counter', p.modelName === 'Model 1' && p.kind === 'counter' && p.panel === 'counter', JSON.stringify(p));
await interactAt(-6.3, 2.6, 0);
p = await probe();
check('loads the network back', p.modelName === 'Model 2' && p.kind === 'network' && p.panel === 'network', JSON.stringify(p));

// the prompt is the player's own input
check('open keys', (await interactAt(-4.6, 1.7, 0, 700)) === 'Play a prompt (open the keys)', await prompt());
p = await probe();
check('keys open', p.keysOpen === true, JSON.stringify(p));
await page.keyboard.press('Digit1');
await page.keyboard.press('Digit3');
await page.waitForTimeout(250);
p = await probe();
check('prompt is user input', JSON.stringify(p.promptNotes) === JSON.stringify([0, 2]), JSON.stringify(p.promptNotes));
check('live expectation', p.expects.length >= 1, JSON.stringify(p.expects));
await page.click('.ask-clear');
await page.waitForTimeout(250);
p = await probe();
check('clear prompt', p.promptNotes.length === 0, JSON.stringify(p.promptNotes));
await page.click('.ask-sample');
await page.waitForTimeout(250);
p = await probe();
check('sample prompt', p.promptNotes.length > 0, JSON.stringify(p.promptNotes));
await page.click('.ask-clear');
await page.waitForTimeout(180);
await page.keyboard.press('Digit1');
await page.keyboard.press('Digit3');
await page.waitForTimeout(200);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
p = await probe();
check(
  'recall from user prompt',
  JSON.stringify(p.lastPrompt) === JSON.stringify([0, 2]) && p.lastSeq.length === 8,
  JSON.stringify({ prompt: p.lastPrompt, seq: p.lastSeq }),
);
await page.screenshot({ path: '/tmp/kilo/shot-9-echo.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await until(async () => !(await probe()).playing, 8000);

const tBefore = (await probe()).temp;
await interactAt(-4.6, 2.6, 0);
p = await probe();
check('heat cycles', p.temp !== tBefore, `${tBefore} -> ${p.temp}`);
const mBefore = (await probe()).memory;
await interactAt(4.6, 2.6, 0);
p = await probe();
check('memory cycles', p.memory !== mBefore, `${mBefore} -> ${p.memory}`);
const lBefore = (await probe()).labels;
await interactAt(6.3, 2.6, 0);
p = await probe();
check('labels cycle', p.labels !== lBefore, `${lBefore} -> ${p.labels}`);

check('echo keepsake prompt', (await interactAt(6.1, -2.5, 0)) === 'Take the Echo', await prompt());
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
p = await probe();
check('echo keepsake', p.keepsakes === 2 && p.journal === 2, JSON.stringify(p));
check('leave echo', (await interactAt(0, 4.6, 0)) === 'Return to the clearing', await prompt());
await page.waitForTimeout(900);

// ————— The Hall of History: objects you zoom into —————
check('history door', (await interactAt(0, 8.2, 0)) === 'Enter the Hall of History', await prompt());
await page.waitForTimeout(1200);
check('routed to history', page.url().includes('#history.door'), page.url());
check('hall spawn can walk', await walk(0.6));

check('focus does it fit', (await interactAt(-6.0, -0.5, 0)) === 'Use Does it fit?', await prompt());
await page.waitForTimeout(500);
check('the perceptron sits on top', (await page.$('.fit-model')) !== null, 'no canvas');
const fitSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check(
  'one plain line, no jargon',
  fitSay.length > 0 && !/weight|bias|gradient|vector|threshold|epoch|probability|neuron/i.test(fitSay),
  fitSay,
);
const fitState = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { phase: st?.dataset.phase, said: st?.dataset.said, wBall: st?.dataset.wBall, wHole: st?.dataset.wHole };
});
check('it makes its call before the drop', fitState.phase === 'guess' && (fitState.said === 'fits' || fitState.said === 'no'), JSON.stringify(fitState));
let sawLie = false;
for (let i = 0; i < 14; i++) {
  await page.click('.fit-in');
  await page.waitForTimeout(2400);
  const t = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
  if (/believes you/i.test(t)) sawLie = true;
}
const afterYes = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { need: Number(st?.dataset.need ?? 0), said: st?.dataset.said ?? '', copied: st?.dataset.copied ?? '' };
});
check('teach it "fits" and it says fits everywhere', afterYes.need > 0.3 && afterYes.said === 'fits' && Number(afterYes.copied) >= 14, JSON.stringify(afterYes));
check('it copies a lie you teach it', sawLie, 'no lie came up in 14 rounds');
for (let i = 0; i < 14; i++) {
  await page.click('.fit-out');
  await page.waitForTimeout(2400);
}
const afterNo = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { need: Number(st?.dataset.need ?? 0), said: st?.dataset.said ?? '', score: document.querySelector('.fit-score')?.textContent ?? '' };
});
check('teach it "does not fit" and it swings the other way', afterNo.need < -0.3 && afterNo.said === 'no', JSON.stringify(afterNo));
check('the copy score is kept', /it copies you: \d+ in a row/.test(afterNo.score), afterNo.score);

// training is done: let it run on its own
await page.click('.fit-auto');
await page.waitForTimeout(400);
let solo = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { auto: st?.dataset.auto ?? '', total: Number(st?.dataset.autoTotal ?? 0) };
});
check('it runs on its own when you decide training is done', solo.auto === 'on', JSON.stringify(solo));
await page.waitForTimeout(8000);
solo = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return {
    auto: st?.dataset.auto ?? '',
    total: Number(st?.dataset.autoTotal ?? 0),
    right: Number(st?.dataset.autoRight ?? 0),
    score: document.querySelector('.fit-score')?.textContent ?? '',
  };
});
check('it keeps calling and dropping by itself', solo.auto === 'on' && solo.total >= 3 && solo.right <= solo.total, JSON.stringify(solo));
check('its solo score is shown', /on its own: \d+ right of \d+/.test(solo.score), solo.score);
await page.screenshot({ path: '/tmp/kilo/shot-13-fit.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('step back to the hall', await page.evaluate(() => document.getElementById('expo').hidden), 'still open');

check('focus the balloon study', (await interactAt(-3.0, -0.5, 0)) === 'Use The balloon study', await prompt());
await page.waitForTimeout(600);
const diagramShown = await page.evaluate(() => {
  const d = document.querySelector('.balloons-diagram');
  const c = document.querySelector('.bm-row');
  return { diagram: !!d && !d.hidden, cards: !!c && !c.hidden, model: document.querySelector('#expo-stage')?.dataset.model };
});
check('the actual machine is drawn: inputs into five units', diagramShown.diagram && !diagramShown.cards && diagramShown.model === 'diagram', JSON.stringify(diagramShown));
await page.click('.balloons-show');
await page.waitForTimeout(250);
const numbersShown = await page.evaluate(() => {
  const d = document.querySelector('.balloons-diagram');
  const c = document.querySelector('.bm-row');
  return { diagram: !!d && !d.hidden, cards: !!c && !c.hidden, model: document.querySelector('#expo-stage')?.dataset.model };
});
check('the numbers are one tap away', numbersShown.cards && !numbersShown.diagram && numbersShown.model === 'numbers', JSON.stringify(numbersShown));
const cardCount = await page.evaluate(() => document.querySelectorAll('.bm-card').length);
check('the five machines are on screen', cardCount === 5, `cards=${cardCount}`);
const balloonSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check(
  'one plain line, no jargon',
  balloonSay.length > 0 && !/weight|bias|gradient|vector|threshold|epoch|probability/i.test(balloonSay),
  balloonSay,
);
const balloonAt = () => page.evaluate(() => document.querySelector('#expo-stage')?.dataset.balloons ?? 'none');
await until(async () => (await balloonAt()) !== 'none', 12000);
await page.click('.balloons-pause');
await page.waitForTimeout(200);
const frozenA = await balloonAt();
await page.waitForTimeout(1200);
const frozenB = await balloonAt();
check('pause stops the balloon flow', frozenA.split(',')[1] === frozenB.split(',')[1], `${frozenA} vs ${frozenB}`);
await page.click('.balloons-pause');
await page.waitForTimeout(600);
const upCol = Number((await balloonAt()).split(',')[2]);
await page.click('.balloons-pop');
await page.waitForTimeout(600);
const popped = await page.evaluate((c) => {
  const st = document.querySelector('#expo-stage');
  const val = document.querySelector(`.bm-card[data-colour="${c}"] .bm-value`)?.textContent ?? '';
  return { bursts: Number(st?.dataset.bursts ?? 0), val };
}, upCol);
check('the pop button bursts the one that is up', popped.bursts >= 1, JSON.stringify(popped));
check('its machine turns against that colour, on screen', popped.val.startsWith('-'), popped.val);
await until(async () => (await balloonAt()) !== 'none', 12000);
const keepCol = Number((await balloonAt()).split(',')[2]);
const keptBefore = Number((await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.kept ?? '')).split(',')[keepCol]);
await until(
  async () => Number((await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.kept ?? '')).split(',')[keepCol]) > keptBefore,
  14000,
);
check('letting one rise keeps it for that colour', true, '');
await page.click('.balloons-play');
await page.waitForTimeout(700);
check('the model plays for you', (await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.auto)) === 'on', 'not on');
await page.waitForTimeout(7500);
const balloonSolo = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return {
    auto: st?.dataset.auto,
    bursts: Number(st?.dataset.itsBursts ?? 0),
    kept: (st?.dataset.itsKept ?? '').split(',').reduce((a, b) => a + Number(b), 0),
  };
});
check('it bursts and keeps by itself', balloonSolo.auto === 'on' && balloonSolo.bursts + balloonSolo.kept >= 2, JSON.stringify(balloonSolo));
await page.screenshot({ path: '/tmp/kilo/shot-13-balloons.png' });
await page.click('.balloons-play');
await page.waitForTimeout(500);
check('you can stop it and take over', (await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.auto)) === 'off', 'still on');
await page.click('.balloons-again');
await page.waitForTimeout(400);
const wiped = await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.colourWeights ?? '');
check('start again forgets what it learned', /^0\.00(,0\.00){4}$/.test(wiped), wiped);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

check('focus the piano', (await interactAt(0, -0.5, 0)) === 'Use The piano', await prompt());
await page.waitForTimeout(600);
check('the model is shown above the keys', (await page.$('.piano-model')) !== null, 'no canvas');
const runWait = () =>
  until(async () => (await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.step ?? '')) === 'run', 30000);
const trainAndPlay = async () => {
  await page.click('.piano-train');
  await runWait();
  await page.click('.piano-playpause');
  await page.waitForTimeout(400);
};
const phaseOf = () => page.evaluate(() => document.querySelector('#expo-stage')?.dataset.piano ?? '');
const playedOf = () => page.evaluate(() => Number(document.querySelector('#expo-stage')?.dataset.played ?? 0));
const keyHandles = await page.$$('.piano-key');

// typing trains it, and it waits for you to press play
for (const i of [0, 0, 4, 4]) {
  await keyHandles[i].click();
  await page.waitForTimeout(200);
}
await page.click('.piano-train');
await page.waitForTimeout(700);
const trainingNow = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { step: st?.dataset.step, played: Number(st?.dataset.played ?? 0), say: document.getElementById('expo-say')?.textContent ?? '' };
});
check('training plays your tune while it learns', trainingNow.step === 'train' && trainingNow.played > 0, JSON.stringify(trainingNow));
const pianoLearned = await runWait();
const waiting = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { step: st?.dataset.step, phase: st?.dataset.piano, say: document.getElementById('expo-say')?.textContent ?? '' };
});
check('then it waits for you to press play', pianoLearned && waiting.step === 'run' && /press play/i.test(waiting.say), JSON.stringify(waiting));
await page.screenshot({ path: '/tmp/kilo/shot-15-piano.png' });

// transport: play, pause, resume, stop
await page.click('.piano-playpause');
await page.waitForTimeout(700);
const playingNow = await playedOf();
check('play starts it', (await phaseOf()) === 'continuing' && playingNow > 0, JSON.stringify({ phase: await phaseOf(), playingNow }));
await page.click('.piano-playpause');
await page.waitForTimeout(300);
const pausedAt = await playedOf();
await page.waitForTimeout(1200);
check('pause holds it where it is', (await playedOf()) === pausedAt && (await phaseOf()) === 'continuing', JSON.stringify({ pausedAt }));
await page.click('.piano-playpause');
await page.waitForTimeout(900);
check('play resumes it', (await playedOf()) > pausedAt, JSON.stringify({ pausedAt, now: await playedOf() }));
await page.click('.piano-stop');
await page.waitForTimeout(300);
check('stop ends it', (await phaseOf()) === 'idle', await phaseOf());
await page.click('.piano-playpause');
await page.waitForTimeout(600);
check('you can play the trained tune again after stopping', (await phaseOf()) === 'continuing', await phaseOf());
await page.click('.piano-stop');
await page.waitForTimeout(300);

// let it finish on its own: the size of the learned tune
for (const i of [0, 1, 2, 3]) {
  await keyHandles[i].click();
  await page.waitForTimeout(200);
}
await trainAndPlay();
await until(async () => (await phaseOf()) === 'idle', 12000);
const pianoFinished = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { notes: Number(st?.dataset.notes ?? 0), say: document.getElementById('expo-say')?.textContent ?? '' };
});
check('it plays a full tune and stops', pianoFinished.notes >= 12, JSON.stringify(pianoFinished));
check('it says what that has to do with chatbots', /chatbot/i.test(pianoFinished.say), pianoFinished.say.slice(0, 90));

// one and two hidden layers
await page.click('.piano-mode[data-mode="layer"]');
await page.waitForTimeout(300);
const modeSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check('the name is explained, not just used', /hidden layer/.test(modeSay) && /nothing outside/i.test(modeSay), modeSay.slice(0, 110));
for (const i of [0, 1, 2, 3]) {
  await keyHandles[i].click();
  await page.waitForTimeout(200);
}
await trainAndPlay();
await until(async () => (await phaseOf()) === 'idle', 15000);
const adv = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { depth: st?.dataset.depth, notes: Number(st?.dataset.notes ?? 0) };
});
check('a hidden layer trains and plays', adv.depth === '1' && adv.notes >= 12, JSON.stringify(adv));
await page.click('.piano-mode[data-mode="deep"]');
await page.waitForTimeout(250);
for (const i of [4, 5, 6, 7]) {
  await keyHandles[i].click();
  await page.waitForTimeout(200);
}
await trainAndPlay();
await until(async () => (await phaseOf()) === 'idle', 18000);
const deep = await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.depth);
check('two hidden layers train too', deep === '2', String(deep));
await page.click('.piano-numbers');
await page.waitForTimeout(250);
check('the numbers button reveals the values', (await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.numbers)) === 'on', 'off');
await page.screenshot({ path: '/tmp/kilo/shot-16-piano-layers.png' });
await page.click('.piano-numbers');
await page.waitForTimeout(150);

// switching how it thinks stops the old tune dead
for (const i of [0, 1, 2, 3]) {
  await keyHandles[i].click();
  await page.waitForTimeout(200);
}
await trainAndPlay();
await until(async () => (await phaseOf()) === 'continuing', 8000);
await page.click('.piano-mode[data-mode="heart"]');
await page.waitForTimeout(400);
const afterSwitch = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { phase: st?.dataset.piano, timer: st?.dataset.timer, notes: Number(st?.dataset.notes ?? 0) };
});
await page.waitForTimeout(1200);
const stillSame = await page.evaluate(() => Number(document.querySelector('#expo-stage')?.dataset.notes ?? 0));
check(
  'switching modes stops the old tune completely',
  afterSwitch.phase === 'listen' && afterSwitch.timer === 'off' && stillSame === afterSwitch.notes,
  JSON.stringify({ ...afterSwitch, stillSame }),
);

// expanded: three hidden layers, a pause key, a little noise
await page.click('.piano-mode[data-mode="expanded"]');
await page.waitForTimeout(250);
const expanded = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { vocab: st?.dataset.vocab, noise: st?.dataset.noise, restHidden: document.querySelector('.piano-rest')?.hidden ?? true };
});
check('expanded mode has three layers, a rest key and a little noise', expanded.vocab === '9' && expanded.noise === 'on' && expanded.restHidden === false, JSON.stringify(expanded));
for (const step of ['Digit1', 'Digit1', 'Digit0', 'Digit3', 'Digit3', 'Digit0', 'Digit5']) {
  await page.keyboard.press(step);
  await page.waitForTimeout(160);
}
check('pauses are written into the tune', (await page.evaluate(() => Number(document.querySelector('#expo-stage')?.dataset.notes ?? 0))) === 7, 'notes');
await trainAndPlay();
await until(async () => (await phaseOf()) === 'idle', 15000);
const expandedDone = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { depth: st?.dataset.depth, notes: Number(st?.dataset.notes ?? 0), say: document.getElementById('expo-say')?.textContent ?? '' };
});
check('three hidden layers trained and played on', expandedDone.depth === '3' && expandedDone.notes >= 15, JSON.stringify(expandedDone));
check('it owns up to the pauses', /remembered the gaps/i.test(expandedDone.say), expandedDone.say.slice(0, 80));
await page.screenshot({ path: '/tmp/kilo/shot-18-piano-expanded.png' });

// learn a real song: load it as input, train it as usual, then transport it
await page.click('.piano-mode[data-mode="song"]');
await page.waitForTimeout(350);
const songUi = await page.evaluate(() => ({
  songs: document.querySelectorAll('.piano-song').length,
  keysHidden: document.querySelector('.piano-keys')?.hidden ?? false,
}));
check('song mode offers old melodies and hides the keys', songUi.songs === 3 && songUi.keysHidden === true, JSON.stringify(songUi));
await page.click('.piano-song[data-song="twinkle"]');
await page.waitForTimeout(300);
const loaded = await page.evaluate(() => Number(document.querySelector('#expo-stage')?.dataset.notes ?? 0));
check('the tune is loaded as the input', loaded === 14, String(loaded));
await runWait();
let songState = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { step: st?.dataset.step, depth: st?.dataset.depth, song: st?.dataset.song, say: document.getElementById('expo-say')?.textContent ?? '' };
});
check('and it is trained like anything else', songState.step === 'run' && songState.depth === '2' && songState.song === 'twinkle', JSON.stringify(songState));
await page.click('.piano-layers');
await page.waitForTimeout(350);
await runWait();
check('a third layer can be asked for', (await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.depth)) === '3', 'depth');
await page.click('.piano-playpause');
await page.waitForTimeout(900);
const playingSong = await playedOf();
await page.click('.piano-playpause');
await page.waitForTimeout(300);
const pausedSong = await playedOf();
await page.waitForTimeout(1000);
check('the song can be paused while you plan', pausedSong === (await playedOf()), JSON.stringify({ playingSong, pausedSong }));
await page.screenshot({ path: '/tmp/kilo/shot-19-song.png' });
await page.click('.piano-stop');
await page.waitForTimeout(300);
check('and stopped when you like', (await phaseOf()) === 'idle', await phaseOf());
await page.click('.piano-hear');
await page.waitForTimeout(800);
check('you can hear the real tune for comparison', (await phaseOf()) === 'continuing', await phaseOf());
await page.click('.piano-stop');
await page.waitForTimeout(300);

// a word per key, a bigger model, and a tiny story
await page.click('.piano-mode[data-mode="words"]');
await page.waitForTimeout(350);
const storyUi = await page.evaluate(() => ({
  vocab: document.querySelector('#expo-stage')?.dataset.vocab,
  words: document.querySelectorAll('.piano-word').length,
  noteKeysShown: document.querySelectorAll('.piano-key:not(.piano-word):not(.piano-rest):not([hidden])').length,
}));
check('a word per key, a bigger model, notes hidden', storyUi.vocab === '12' && storyUi.words === 12 && storyUi.noteKeysShown === 0, JSON.stringify(storyUi));
const wordKeys = await page.$$('.piano-word');
for (const i of [0, 1, 2, 0, 1, 4]) {
  await wordKeys[i].click();
  await page.waitForTimeout(190);
}
await trainAndPlay();
await until(async () => (await phaseOf()) === 'idle', 20000);
const story = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { depth: st?.dataset.depth, notes: Number(st?.dataset.notes ?? 0), say: document.getElementById('expo-say')?.textContent ?? '' };
});
check('it writes the next words', story.depth === '2' && story.notes >= 14, JSON.stringify({ depth: story.depth, notes: story.notes }));
check('and it names what that is', /chatbot|language model/i.test(story.say), story.say.slice(0, 90));
await page.screenshot({ path: '/tmp/kilo/shot-20-words.png' });

// the simple mode has no pause key
await page.click('.piano-mode[data-mode="heart"]');
await page.waitForTimeout(300);
const simpleState = await page.evaluate(() => ({
  restHidden: document.querySelector('.piano-rest')?.hidden ?? true,
  noise: document.querySelector('#expo-stage')?.dataset.noise,
}));
check('the simple mode has no pause key', simpleState.restHidden === true && simpleState.noise === 'off', JSON.stringify(simpleState));

// keep going forever, and the stop knob
await page.click('.piano-forever');
await page.waitForTimeout(150);
for (const i of [0, 1, 2]) {
  await keyHandles[i].click();
  await page.waitForTimeout(200);
}
await trainAndPlay();
await page.waitForTimeout(4200);
const running = await page.evaluate(() => {
  const st = document.querySelector('#expo-stage');
  return { phase: st?.dataset.piano ?? '', notes: Number(st?.dataset.notes ?? 0) };
});
check('it keeps going until told to stop', running.phase === 'continuing' && running.notes > 11, JSON.stringify(running));
await page.click('.piano-stop');
await page.waitForTimeout(300);
check('the stop knob interrupts immediately', (await phaseOf()) === 'idle', await phaseOf());

await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// where words live: the map of areas
check('focus the word map', (await interactAt(3.0, -0.5, 0)) === 'Use Where words live', await prompt());
await page.waitForTimeout(600);
const wordsSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check(
  'words explained without jargon',
  /reaches for/.test(wordsSay) && !/vector|embedding|cosine|PMI|cluster/i.test(wordsSay),
  wordsSay.slice(0, 90),
);
const kingAt = await page.evaluate(() => {
  const c = document.querySelector('.expo-canvas');
  const pts = JSON.parse(c.dataset.points);
  const r = c.getBoundingClientRect();
  const [px, py] = pts['king'];
  return { x: r.x + (px / c.width) * r.width, y: r.y + (py / c.height) * r.height };
});
await page.mouse.click(kingAt.x, kingAt.y);
await page.waitForTimeout(300);
const kingSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check('tapping a word shows its company', /queen|prince|crown|throne/.test(kingSay), kingSay.slice(0, 90));
await page.screenshot({ path: '/tmp/kilo/shot-14-words.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

check('focus the confident answer', (await interactAt(6.0, -0.5, 0)) === 'Use Sounding sure', await prompt());
await page.waitForTimeout(500);
const heardSlot = await page.$('.sentence-slot');
await heardSlot.click();
await page.waitForTimeout(300);
let sureSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check('it finishes a familiar sentence', /taught it|was .*sure/i.test(sureSay), sureSay.slice(0, 80));
for (let i = 0; i < 6; i++) {
  const kind = await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.promptKind ?? '');
  if (kind === 'never') break;
  await page.click('.sentence-next');
  await page.waitForTimeout(150);
}
const kindNow = await page.evaluate(() => document.querySelector('#expo-stage')?.dataset.promptKind ?? '');
check('reached a sentence it never heard', kindNow === 'never', kindNow);
await page.click('.sentence-slot');
await page.waitForTimeout(300);
sureSay = await page.evaluate(() => document.getElementById('expo-say')?.textContent ?? '');
check(
  'it is confidently wrong, and says why',
  /cannot tell/.test(sureSay) && /sounds right/.test(sureSay) && !/probability|gradient|weight/i.test(sureSay),
  sureSay.slice(0, 110),
);
await page.screenshot({ path: '/tmp/kilo/shot-16-sure.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('leave history', (await interactAt(0, 4.5, 0)) === 'Return to the clearing', await prompt());
await page.waitForTimeout(1000);

// persistence

await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1200);
p = await probe();
check('keepsakes persisted', p.keepsakes === 2 && p.journal === 2, JSON.stringify({ k: p.keepsakes, j: p.journal }));
const models = await page.evaluate(() => {
  const raw = localStorage.getItem('satyrn25d.music.v2');
    return raw ? JSON.parse(raw).models.length : -1;
});
check('models persisted', models === 2, `models=${models}`);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE ERRORS');
await browser.close();
process.exit(fails.length ? 1 : 0);
