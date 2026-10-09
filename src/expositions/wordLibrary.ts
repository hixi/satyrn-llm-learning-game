import type { Exposition } from '../ui/exposition';
import { buildEmbedding, nearest } from '../game/music/embedding';

function kmeans(points: [number, number][], k: number, seeds: number[]): number[] {
  let centroids = seeds.map((i) => points[i].slice() as [number, number]);
  let assign = points.map(() => 0);
  for (let it = 0; it < 40; it++) {
    const next = points.map(([x, y]) => {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach(([cx, cy], c) => {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      });
      return best;
    });
    const changed = next.some((v, i) => v !== assign[i]);
    assign = next;
    centroids = centroids.map((c, ci) => {
      const members = points.filter((_, i) => assign[i] === ci);
      if (members.length === 0) return c;
      return [
        members.reduce((a, p) => a + p[0], 0) / members.length,
        members.reduce((a, p) => a + p[1], 0) / members.length,
      ];
    });
    if (!changed) break;
  }
  return assign;
}

/** One object: a map where words settle by the company they keep. */
export const wordLibrary: Exposition = {
  id: 'words',
  title: 'Where words live',
  build(root, say) {
    const emb = buildEmbedding();
    const area = kmeans(emb.xy, 3, ['king', 'cat', 'bread'].map((w) => emb.index.get(w) ?? 0));
    const near = new Map<string, string[]>();
    for (const w of emb.vocab) near.set(w, nearest(emb, w, 3).map((n) => n.word));
    const colors = ['#d9a441', '#7fb069', '#6fa8dc'];

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 440;
    canvas.className = 'expo-canvas';
    const g = canvas.getContext('2d')!;
    const toScreen = (x: number, y: number): [number, number] => [
      canvas.width / 2 + x * (canvas.width * 0.4),
      canvas.height / 2 - y * (canvas.height * 0.42),
    ];
    let selected = emb.index.has('king') ? 'king' : emb.vocab[0];

    function draw(): void {
      g.fillStyle = '#141a19';
      g.fillRect(0, 0, canvas.width, canvas.height);
      for (let c = 0; c < 3; c++) {
        const members = emb.xy.filter((_, i) => area[i] === c);
        if (!members.length) continue;
        const cx = members.reduce((a, p) => a + p[0], 0) / members.length;
        const cy = members.reduce((a, p) => a + p[1], 0) / members.length;
        const rad = Math.max(...members.map(([x, y]) => Math.hypot(x - cx, y - cy))) * canvas.width * 0.4 + 54;
        const [sx, sy] = toScreen(cx, cy);
        const grad = g.createRadialGradient(sx, sy, 8, sx, sy, rad);
        grad.addColorStop(0, `${colors[c]}44`);
        grad.addColorStop(1, `${colors[c]}05`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(sx, sy, rad, 0, Math.PI * 2);
        g.fill();
      }
      const from = toScreen(...emb.xy[emb.index.get(selected)!]);
      for (const w of near.get(selected) ?? []) {
        const to = toScreen(...emb.xy[emb.index.get(w)!]);
        g.strokeStyle = 'rgba(244,236,216,.55)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(from[0], from[1]);
        g.lineTo(to[0], to[1]);
        g.stroke();
      }
      emb.vocab.forEach((w, i) => {
        const [sx, sy] = toScreen(...emb.xy[i]);
        const isSel = w === selected;
        g.beginPath();
        g.arc(sx, sy, isSel ? 10 : 6, 0, Math.PI * 2);
        g.fillStyle = isSel ? '#f4ecd8' : colors[area[i]];
        g.fill();
        g.font = `${isSel ? '700' : '400'} 17px Georgia, serif`;
        g.fillStyle = isSel ? '#f4ecd8' : 'rgba(244,236,216,.85)';
        g.fillText(w, sx + 12, sy + 6);
      });
    }

    const onTap = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
      let best: string | null = null;
      let bestD = 26;
      emb.vocab.forEach((w, i) => {
        const [px, py] = toScreen(...emb.xy[i]);
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      });
      if (best) select(best);
    };
    canvas.addEventListener('pointerdown', onTap);

    function select(word: string): void {
      selected = word;
      draw();
      say(`After “${word}” it reaches for ${(near.get(word) ?? []).join(', ')}. It is not looking anything up — it is standing in one part of the map, and those words live there too.`);
    }

    canvas.dataset.points = JSON.stringify(
      Object.fromEntries(emb.vocab.map((w, i) => [w, toScreen(...emb.xy[i])])),
    );
    root.append(canvas);
    draw();
    say('Each dot is a word. Nobody sorted them — they drifted together because they turn up in the same kinds of sentences. Tap one.');
    select(selected);

    return {
      dispose() {
        canvas.removeEventListener('pointerdown', onTap);
      },
    };
  },
};
