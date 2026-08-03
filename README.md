# js-tetris

A mostly functional Tetris game built with HTML5 Canvas and vanilla JavaScript. This public personal project demonstrates git workflow discipline while evolving a fully custom game engine.

The browser game has no third-party runtime libraries, frameworks, production dependencies, or build step.

## What to expect

- The game loads from the canonical `index.html` entry point.
- It starts paused.
- Start/Pause Game or `P`/`S` begins or pauses play.
- Restart Game or `R` resets the current round.
- Arrow keys move and rotate; Space drops the piece instantly.
- Status text and the live region mirror game state, while Start/Pause disables at game over and Restart remains the recovery path.

## Play locally

Serve the repository root with a static server:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000/>.

## Architecture and persistence

`index.html` loads `js/Tetris.js` first and `js/TestCase.js` second.
`Game.allTets` is the authoritative board state; `Game.landed` is derived from it.
Row clears can fragment pieces and cascade unsupported cells.
High scores are stored in cookies and are repaired or ignored when the saved shape is invalid, unreadable, or unwritable.

## Documentation and contributing

Maintained project documentation lives here, in [`CONTRIBUTING.md`](CONTRIBUTING.md), and in [`AGENTS.md`](AGENTS.md).
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the clean-checkout setup, exact development checks, and contribution expectations.
