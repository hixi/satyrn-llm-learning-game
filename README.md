# Satyrn — The Wayfarer's Ground (2.5D)

A browser-based 2.5D exploration game that explains how LLMs work. You are the
**Wayfarer**, walking between small handmade worlds; each world you enter makes
one idea physical instead of explaining it in prose. Iteration 1 ships the core
mechanics and the First Chamber; the concept worlds (towers, libraries, …)
come later — see `docs/superpowers/2026-10-08-2.5d-exploration-iteration-1.md`.

No backend, no accounts, no network calls. Progress (keepsakes, journal) stays
in your `localStorage`.

## Play

```sh
npm install
npm run dev
```

Open the address Vite prints. Production build: `npm run build` (the GitHub
Pages workflow deploys `dist/` on push to `main`). Hash routing needs no
server rewrites.

## Controls

| Desktop | Mobile |
|---|---|
| WASD / arrows move | left-side virtual joystick |
| `E` / Enter / Space interact | ✦ button (appears near objects) |
| `Q` / `R` rotate camera 90° | — |
| Notebook open: `1`–`8` notes, Backspace undo, Enter train, Esc close | tap the on-screen keys |

A **time** button in the corner slows learning and inference right down
(1× → 0.5× → 0.25× → 0.1×) so you can watch each step; the Training Hall also
has a **Step** plinth that teaches one note (or one pass) at a time.

Sound is a built-in Web Audio synth (no audio assets); it starts on your first
tap or keypress.

## The halls

Two halves of one idea: a model is its data, and it answers with what its data
taught it.

**The Training Hall — make a model.**

1. Open the notebook (walk to the desk, press `E`) and play notes on the eight
   keys. Each key is a note *and* a word, so phrases read like little sentences.
2. Choose the **Method** on the stand: a *counter* (tallies which note followed
   which) or a *network* (a real 208-weight neural network trained with
   gradients). Then press **Train**. For a counter the notebook folds away and
   you watch it count transitions; for a network you watch the hidden layer
   light up and the **loss fall**. With one short phrase the loss drops near
   zero — it has memorised, and asking it anything else flounders. That is
   overfitting, shown live.
3. It saves to your shelf as `Model 1`, `Model 2`, … Step 3 is to hear it in
   the Echo Hall.

**The Echo Hall — use a model.**

1. Load a model on the stand: the built-in **Old Songs** (it ships as *both* a counter and a trained network), or any model you trained.
2. Play **your own prompt** on the ask keys (1–4 notes) — or press **Sample**
   to borrow the model's opening. The panel and the sheet update live:
   *expects "cat" 62%*.
3. Press **Let it continue**: it generates eight notes by feeding its own
   expectation back in as the next input. That loop is inference. **Heat**
   (temperature) = how adventurous, **Memory** = how many of your last notes it
   looks at.
4. Swap models and ask the same prompt again — same question, different
   singer, because the data differed.

- **The Hall of History** — a quiet hall with four objects on plinths, in the
  order the ideas arrived. Use one and the view *zooms into just that object*:
  no character, nothing else on screen, one short line telling you what
  happened.
  1. *Does it fit?* — a ball above a hole, drawn to size. The machine calls
     *fit* or *no fit* before the drop, then the ball drops and the truth is
     physics. Nobody tells it the rule: from the drops alone its two dials
     settle to "the ball counts against, the hole counts for". You can drag
     the ball or the hole to hunt for the moment it becomes unsure. The
     perceptron sits on top, weights and all.
  2. *The balloon study* — burst the balloons you dislike; the rest float up and
     are kept, one pile per colour. Five little machines, one per colour, watch
     and learn your taste — their weights are drawn as the actual wiring
     (which colours each one sees, and how much each counts), with the numbers
     one tap away. **Pause** stops the flow, **pop this one** bursts without
     aiming, and **let the model play for you** hands over the bursting until
     you stop it and teach it more.
  3. *The piano* — hum a tune; above the keys you watch how it thinks, then it
     takes over. Three ways of thinking: **by heart** (only "after this note,
     usually that one"), **one extra layer**, or **two extra layers** (real
     hidden layers, trained on the spot). **Keep going** plays on indefinitely
     and a **stop** knob interrupts whenever you like.
  4. *Where words live* — words settle into areas by the company they keep;
     tap one and watch which words it reaches for.
  5. *Sounding sure* — finish a familiar sentence, then one it has never
     heard and which makes no sense. It answers confidently anyway: it picks
     the most likely next word, not the true one. That is the thing to design
     around.

Each hall has a **help desk** — a lectern marked *"Help — what is this?"*. It
opens a scrollable explanation of that hall: the steps, what the model
actually is, what every control does, and things to try. If something is ever
unclear, start there.

Models persist in `localStorage` (up to six; the oldest slides off the shelf),
and notebook drafts persist too.

## Play

```sh
npm install
npm run dev
```

Open the address Vite prints. Production build: `npm run build` (the GitHub
Pages workflow deploys `dist/` on push to `main`). Hash routing needs no
server rewrites.

## Controls

| Desktop | Mobile |
|---|---|
| WASD / arrows move | left-side virtual joystick |
| `E` / Enter / Space interact | ✦ button (appears near objects) |
| `Q` / `R` rotate camera 90° | — |
| Notebook open: `1`–`8` notes, Backspace undo, Enter train, Esc close | tap the on-screen keys |

A **time** button in the corner slows learning and inference right down
(1× → 0.5× → 0.25× → 0.1×) so you can watch each step; the Training Hall also
has a **Step** plinth that teaches one note (or one pass) at a time.

Sound is a built-in Web Audio synth (no audio assets); it starts on your first
tap or keypress.

## The halls

The clearing holds exactly two enterable halls — two halves of one idea: a
model is its data, and it answers with what its data taught it.

- **The Training Hall** — *teach it*. Walk to the desk and press `E` to open
  the notebook; play notes on the eight-key piano (keys 1–8, or click), then
  **Train**. The notebook folds away and the network learns in front of you,
  step by step: every note transition it sees thickens an edge. When it
  finishes, the model is saved to your shelf with a name — *Model 1, Model 2…*
- **The Echo Hall** — *play it*. It loads the model currently on your shelf:
  the built-in **Old Songs**, or any model you trained. Choose a prompt, press
  **Let it continue**, and it sings the eight notes it expects next with live
  probabilities. **Heat** (temperature), **Memory** (how many notes of context
  it keeps) and **Labels** (notes / words / both) change what you hear. Step on
  the model stand to load a *different* model and hear another singer.

Training shows where behaviour comes from (counting which note follows which);
inference lets you interrogate it (sampling, temperature, context) and compare
models. The old songs are the pretrained model, your phrases are one you made.
Nothing is hidden — the drawn network is the whole model.

- **The Hall of History** — a quiet hall with four objects on plinths, in the
  order the ideas arrived. Use one and the view *zooms into just that object*:
  no character, nothing else on screen, one short line telling you what
  happened.
  1. *Does it fit?* — a ball above a hole, drawn to size. The machine calls
     *fit* or *no fit* before the drop, then the ball drops and the truth is
     physics. Nobody tells it the rule: from the drops alone its two dials
     settle to "the ball counts against, the hole counts for". You can drag
     the ball or the hole to hunt for the moment it becomes unsure. The
     perceptron sits on top, weights and all.
  2. *The balloon study* — burst the balloons you dislike; the rest float up and
     are kept, one pile per colour. Five little machines, one per colour, watch
     and learn your taste — their weights are drawn as the actual wiring
     (which colours each one sees, and how much each counts), with the numbers
     one tap away. **Pause** stops the flow, **pop this one** bursts without
     aiming, and **let the model play for you** hands over the bursting until
     you stop it and teach it more.
  3. *The piano* — hum a tune; above the keys you watch how it thinks, then it
     takes over. Three ways of thinking: **by heart** (only "after this note,
     usually that one"), **one extra layer**, or **two extra layers** (real
     hidden layers, trained on the spot). **Keep going** plays on indefinitely
     and a **stop** knob interrupts whenever you like.
  4. *Where words live* — words settle into areas by the company they keep;
     tap one and watch which words it reaches for.
  5. *Sounding sure* — finish a familiar sentence, then one it has never
     heard and which makes no sense. It answers confidently anyway: it picks
     the most likely next word, not the true one. That is the thing to design
     around.

Each hall has a **help desk** — a lectern marked *"Help — what is this?"*. It
opens a scrollable explanation of that hall: the steps, what the model
actually is, what every control does, and things to try. If something is ever
unclear, start there.

Models persist in `localStorage` (up to six; the oldest slides off the shelf),
and notebook drafts persist too.

## Development

```sh
npm run check        # type check + production build
node tools/gen-assets.mjs   # regenerate public/assets/props/bell.glb
npx vite preview --port 4599 &   # then:
node tools/smoke.mjs # headless full-playthrough test
```

## Structure

```
assets-less               models live in public/assets (committed .glb)
src/
  engine/   renderer, camera rig, input, collisions, occluder fader, scene kit, audio synth
  game/     world contract, scene manager + hash router, player, save
  game/music/  transition model, songs, model store, network panel
  worlds/   hub, training-hall, echo-hall, buildingKit
  ui/       HUD, prompts, captions, toasts, touch controls, journal, composer
tools/      gen-assets.mjs, smoke.mjs
```
