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
  return page.evaluate(() => document.getElementById('prompt')?.textContent?.replace(/\s*E$/, '') ?? '');
}
async function interactAt(x, z, yaw, ms = 500) {
  await page.evaluate(([tx, tz, ty]) => window.__satyrn.teleport(tx, tz, ty), [x, z, yaw]);
  await page.waitForTimeout(220);
  const label = await prompt();
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

await page.keyboard.press('Enter');
await page.waitForTimeout(200);
p = await probe();
check('counter training runs', p.busy === true && p.trainKind === 'counter' && p.total === 7, JSON.stringify({ busy: p.busy, total: p.total }));
await page.screenshot({ path: '/tmp/kilo/shot-8-training.png' });
const finished = await until(async () => !(await probe()).busy, 10000);
p = await probe();
check(
  'counter model registered',
  finished && p.trainedNow === true && p.models === 3 && p.model === 'Model 1' && p.size.includes('transition'),
  JSON.stringify(p),
);

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

// persistence
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1200);
p = await probe();
check('keepsakes persisted', p.keepsakes === 2 && p.journal === 2, JSON.stringify(p));
const models = await page.evaluate(() => {
  const raw = localStorage.getItem('satyrn25d.music.v2');
    return raw ? JSON.parse(raw).models.length : -1;
});
check('models persisted', models === 2, `models=${models}`);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE ERRORS');
await browser.close();
process.exit(fails.length ? 1 : 0);
