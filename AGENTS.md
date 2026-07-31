# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## What this is

A Tetris game built with plain HTML5 Canvas + vanilla JavaScript — explicitly no third-party JS libraries (no jQuery, no frameworks, no build tooling). There is no `package.json`, no bundler, no test runner, and no npm scripts. The repo's stated purpose (see README.md) is to demonstrate git workflow discipline while implementing a fully custom Tetris engine.

## Running it

There's no build/dev-server step. Serve the directory root with any static/PHP-capable server and open `index.php` (it's plain HTML despite the `.php` extension — no server-side logic).

## Linting

The codebase follows the `standard` JS style (no semicolons, 2-space indent, single quotes) — see commit "linted with standard". Run `npx standard js/Tetris.js` to check style before editing `Tetris.js`. Note: `js/TestCase.js` still uses the older style (semicolons, tabs) and has not been linted — don't mix styles within a file; match whatever the file you're editing already uses.

## Architecture

Two script files, loaded in order by `index.php`, both attached to the global scope (no modules):

- **`js/Tetris.js`** — the entire engine. Defines two constructor functions:
  - `Game(canvasId, highScoresListId, devMode)` — the top-level controller. Owns the canvas, the game loop (`tetDownLoop`), scoring/high-score persistence (via cookies: `getCookie`/`setCookie`/`getHighScores`/`setHighScores`), input handling (`handleEvents`, bound to `document.onkeydown`/window focus-blur), and the `landed` array (a 2D grid used for collision detection, rebuilt from `allTets` via `getLanded`). Only one `Game` is meant to exist per page.
  - `Tet(game, type)` — a single tetrimino ("Tet" for short). Owns its own shape matrix, rotation/pivot state, and movement/collision methods (`rotate`, `moveLeft/Right/Down`, `doesTetCollideSide/Bot`, `collided`). When rows clear, Tets are split into shape fragments rather than deleted wholesale — see `alterShape`/`alterShapes` and `cleanShape` for how a Tet's matrix gets re-derived after partial removal.
  - Board state model: the game does **not** use a matrix-of-cells board. Instead `allTets` holds every live/landed `Tet`, and `landed` is a derived lookup grid rebuilt on demand (see the commit "Fundamentally changed the way the board is represented"). Any change to collision or clearing logic needs to keep `allTets` and `landed` in sync via `updateLanded`.
  - Shape data lives in a hardcoded `matrixMatrix` inside `Tet.prototype.getShapeMatrix` — one entry per tetrimino type (I, J, L, O, S, T, Z), each holding its rotation states as row-major 0/1 matrices.

- **`js/TestCase.js`** — `Game.prototype.testCase(n)`, a switch statement that hand-places specific `Tet` configurations onto the board (e.g. "T rotated once, single row deletion") for manually exercising row-clear/cascade logic. Only reachable when `devModeOn` is true.

- **Developer mode**: pass `devMode: true` (third arg to `Game`) to unlock extra keybinds in `handleEvents`: number keys 0–9 load `testCase(n)`, `End` nudges the falling Tet up, `G` forces game over, `H` resets high scores, `` ` `` toggles dev mode.

- **`docs/`** is JSDoc-generated HTML output (from the `@param`/`@property` comment blocks in `Tetris.js`) — do not hand-edit; regenerate via a JSDoc tool if source comments change and docs need to stay current.

- **`css/`** — `reset.css` (generic reset) + `main.css` (game layout/panel/canvas styling). No preprocessor.
