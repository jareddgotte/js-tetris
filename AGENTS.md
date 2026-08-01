# AGENTS.md

Guidance for coding agents working in this repository.

## Project boundaries

Preserve the dependency-free vanilla-JavaScript browser runtime: no third-party runtime libraries, frameworks, bundlers, or module migration. Pinned development-only tooling may be added proportionately; substantial modernization is issue-first. Follow `CONTRIBUTING.md` for setup, exact validation commands, test expectations, and pull-request workflow.

Electris is a divergent Electron successor. Individual behavior or domain semantics may be considered as evidence, but never synchronize the repositories wholesale or copy its architecture for parity.

## Architecture and invariants

`index.php` loads two non-module global scripts in order:

- `js/Tetris.js` defines `Game`, the controller, and `Tet`, a tetrimino. It owns the loop, input, scoring, persistence, movement, collision, rotation, and row-clearing behavior. Shape rotation matrices are defined by `Tet.prototype.getShapeMatrix`.
- `js/TestCase.js` adds manual developer-mode board fixtures through `Game.prototype.testCase`.

The board is not stored as a canonical cell matrix. `Game.allTets` is authoritative; `Game.landed` is only a derived collision lookup rebuilt by `getLanded`. Any movement, collision, landing, row clearing, fragmentation, or cascade change must keep `allTets` correct and mark or rebuild `landed` through the existing `updateLanded` protocol before relying on it.

Row clears can split Tets into fragments rather than deleting entire pieces; preserve the `alterShape`/`alterShapes` and `cleanShape` flow. Only one `Game` instance is intended per page.

Changed behavior requires deterministic coverage in `test/engine.test.js`, with browser checks added where relevant. Correct affected stale documentation in the same change. `docs/` is generated JSDoc output; do not hand-edit it.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
