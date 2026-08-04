# AGENTS.md

Guidance for coding agents working in this repository.

## Project boundaries

Preserve the dependency-free vanilla-JavaScript browser runtime: no third-party runtime libraries, frameworks, bundlers, or module migration. Pinned development-only tooling may be added proportionately; substantial modernization is issue-first. Follow `CONTRIBUTING.md` for setup, exact validation commands, test expectations, and pull-request workflow.

Electris is a divergent Electron successor. Individual behavior or domain semantics may be considered as evidence, but never synchronize the repositories wholesale or copy its architecture for parity.

## Architecture and invariants

`index.html` loads two non-module global scripts in order:

- `js/Tetris.js` defines `Game`, the controller, and `Tet`, a tetrimino. It owns the loop, input, scoring, persistence, movement, collision, rotation, and row-clearing behavior. Shape rotation matrices are defined by `Tet.prototype.getShapeMatrix`.
- `js/TestCase.js` adds manual developer-mode board fixtures through `Game.prototype.testCase`.

The board is not stored as a canonical cell matrix. `Game.allTets` is authoritative; `Game.landed` is only a derived collision lookup rebuilt by `getLanded`. Any movement, collision, landing, row clearing, fragmentation, or cascade change must keep `allTets` correct and mark or rebuild `landed` through the existing `updateLanded` protocol before relying on it.

Row clears can split Tets into fragments rather than deleting entire pieces; preserve the `alterShape`/`alterShapes` and `cleanShape` flow. Only one `Game` instance is intended per page.

The row-clear cascade runs on timers tracked in `Game.cascadeLoops` (a `Set`, populated and drained in `Tet.prototype.collided`), separate from the gravity loop `Game.loop`. More than one cascade can be in flight at once — a newly landed Tet can clear a row while an earlier cascade is still settling — so a single scalar id cannot own them; each cascade only ever clears its own id, and `Game.prototype.clearCascadeLoops` clears the whole set. Every cascade tick must stay guarded by `game.paused` so pause and blur freeze it in place, and `clearCascadeLoops` must run alongside `clearInterval(this.loop)` on every reset, game-over, and dev-fixture path — an orphaned cascade timer can mutate `allTets` after a session has ended. See `test/engine.test.js` for the deterministic coverage of these paths.

Changed behavior requires deterministic coverage in `test/engine.test.js`, with browser checks added where relevant. Correct affected stale documentation in the same change. Maintain user-facing, workflow-facing, and agent-facing Markdown in `README.md`, `CONTRIBUTING.md`, and `AGENTS.md`. Do not check in generated JSDoc under `docs/` unless a concrete consumer and a reproducible pinned generation command both exist.

## Automated review workflows

`anthropics/claude-code-action` owns the byte-identical-default-workflow check for `.github/workflows/claude-code-review.yml` pull requests. If a PR changes that workflow, Claude skips execution even when the job stays green, so inspect the workflow logs for an actual run and posted review; do not treat green status as proof. More generally, both workflows can fail silently on misconfiguration, so never treat a green check alone as evidence that Claude ran.

Workflow-changing PRs need manual review plus post-merge verification. `claude.yml`'s `issue_comment` and `issues` triggers run from the default branch, but its `pull_request_review` and `pull_request_review_comment` triggers run from the merge ref like `claude-code-review.yml` does, so this boundary is not exclusive to `claude-code-review.yml`. Repository workflow inline comments describe other substantive publication and tool limits, but they do not implement or own the byte-identical-default-workflow guard.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
