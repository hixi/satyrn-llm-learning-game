import type { Exposition } from '../ui/exposition';
import { LIBRARY_CORPUS } from '../game/music/embedding';

interface Prompt {
  words: string[];
  kind: 'heard' | 'never';
}

const PROMPTS: Prompt[] = [
  { words: ['the', 'king', 'sat', 'on', 'the'], kind: 'heard' },
  { words: ['the', 'baker', 'baked', 'the'], kind: 'heard' },
  { words: ['the', 'cat', 'chased', 'the'], kind: 'heard' },
  { words: ['the', 'cat', 'ruled', 'the'], kind: 'never' },
  { words: ['the', 'baker', 'wore', 'a'], kind: 'never' },
  { words: ['the', 'queen', 'chased', 'the'], kind: 'never' },
];

function buildCounter(): (prev: string) => { word: string; p: number }[] {
  const pairs = new Map<string, Map<string, number>>();
  const singles = new Map<string, number>();
  for (const s of LIBRARY_CORPUS) {
    for (let i = 0; i < s.length; i++) {
      singles.set(s[i], (singles.get(s[i]) ?? 0) + 1);
      if (i > 0) {
        const m = pairs.get(s[i - 1]) ?? new Map<string, number>();
        m.set(s[i], (m.get(s[i]) ?? 0) + 1);
        pairs.set(s[i - 1], m);
      }
    }
  }
  return (prev: string) => {
    const m = pairs.get(prev);
    const counts = m ?? singles;
    if (!m) {
      const total = [...singles.values()].reduce((a, b) => a + b, 0) || 1;
      return [...singles.entries()]
        .map(([word, c]) => ({ word, p: c / total }))
        .sort((a, b) => b.p - a.p)
        .slice(0, 3);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
    return [...counts.entries()]
      .map(([word, c]) => ({ word, p: c / total }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 3);
  };
}

/** It answers with what usually comes next — and cannot tell that some sentences are nonsense. */
export const soundingSure: Exposition = {
  id: 'sure',
  title: 'Sounding sure',
  build(root, say) {
    const predict = buildCounter();
    let idx = 0;
    let answered = false;

    const sentence = document.createElement('div');
    sentence.className = 'sentence';
    const slot = document.createElement('button');
    slot.className = 'ui-btn sentence-slot';
    slot.textContent = '‥';

    const another = document.createElement('button');
    another.className = 'ui-btn sentence-next';
    another.textContent = 'another sentence';

    function render(): void {
      const p = PROMPTS[idx];
      sentence.innerHTML = '';
      for (const w of p.words) {
        const span = document.createElement('span');
        span.textContent = w;
        sentence.appendChild(span);
      }
      sentence.appendChild(slot);
      answered = false;
      slot.textContent = '‥';
      slot.classList.remove('filled', 'sure', 'guessing');
      root.dataset.promptKind = p.kind;
      say('Tap the blank and let it finish the sentence.');
    }

    function answer(): void {
      if (answered) return;
      const p = PROMPTS[idx];
      const top = predict(p.words[p.words.length - 1])[0];
      if (!top) return;
      answered = true;
      slot.textContent = top.word;
      slot.classList.add('filled');
      const sureWord = top.p > 0.45 ? 'quite sure' : top.p > 0.25 ? 'fairly sure' : 'guessing';
      slot.classList.add(sureWord === 'guessing' ? 'guessing' : 'sure');
      if (p.kind === 'heard') {
        say(`It said “${top.word}”, and it was ${sureWord}. Sentences like this one taught it that.`);
      } else {
        say(`It said “${top.word}” and it was ${sureWord} — but this sentence is nonsense, and it cannot tell. It only knows what usually comes next. That is why it sounds right and can still be wrong.`);
      }
    }

    slot.addEventListener('click', answer);
    another.addEventListener('click', () => {
      idx = (idx + 1) % PROMPTS.length;
      render();
    });
    root.append(sentence, another);
    render();
    say('Tap the blank and let it finish the sentence.');

    return { dispose() {} };
  },
};
