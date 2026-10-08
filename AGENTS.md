# AGENTS.md

## Commands

- `npm run check` — type check (`tsc --noEmit`) + production build. Run after any change.
- `npm run dev` — dev server.
- `node tools/gen-assets.mjs` — regenerates `public/assets/props/bell.glb` (commit its output).
- `node tools/smoke.mjs` — headless full-playthrough test (54 checks, both halls). Requires a preview server:
  `npx vite preview --port 4599 --strictPort` running first. Uses `playwright-core` with the
  Chromium at `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome` (swiftshader flags for WebGL2).

## Conventions

- Worlds live in `src/worlds/` and implement the `World` contract in `src/game/world.ts`
  (`interactables`, `colliders`, `bounds`, optional fixed `cam`, `update`, `dispose`).
- Worlds are exactly two: `src/worlds/trainingHall.ts` (compose phrases, train
  a `TransitionModel` live, save it) and `src/worlds/echoHall.ts` (load any
  saved model, run inference). `hub.ts` only routes between them.
- Two model kinds share the `MusicModel` surface (`src/game/music/model.ts`):
  `TransitionModel` (counter, `src/game/music/model.ts`) and `MlpModel` (real
  backprop network, `src/game/music/mlp.ts`). `NetPanel` draws both
  (`presentModel`); trained network weights are stored on the shelf entry.
- The model registry lives in `src/game/music/store.ts`; models persist in
  `localStorage` under `satyrn25d.music.v2`, notebook drafts under
  `satyrn25d.notebook.v1`. Both halls share `NetPanel` for the network drawing.
- Routes are hashes: `#hub`, `#training.door`, `#echo.door`. Scene switches go
  through `SceneManager.navigate` so the fade transition and hash stay in sync.
- The composer (`src/ui/composer.ts`, training) and the asker (`src/ui/asker.ts`,
  inference) are DOM overlays that suppress game input while open via
  `InputManager.setSuppressed`, so movement/interact can't fire behind them.
  In the Echo Hall the prompt is played by the player, not picked from the corpus.
- UI is a DOM overlay (`src/ui/ui.ts`) on top of the canvas; touch and keyboard both feed
  `InputManager` intents (`move`, `interact`, camera snaps).
- World-owned DOM UIs (`src/ui/composer.ts`, `asker.ts`, `help.ts`) build their own host inside
  `#ui` and MUST be `dispose()`d when the world unloads: the host is removed so repeated visits
  don't leave duplicate element ids behind (this caused a real bug once).
- Models are committed `.glb` files under `public/assets/`; load via `AssetStore` and clone —
  clones share geometry/materials (marked `userData.shared`) so scene disposal never disposes them.
- No backend, no network calls; progress persists in `localStorage` (`satyrn25d.save.v1`).
- Deploy target: GitHub Pages (existing workflow deploys `dist/` on push to `main`).
- Design docs live in `docs/superpowers/` with dated filenames.
