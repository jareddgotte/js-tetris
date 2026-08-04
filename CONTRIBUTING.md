# Contributing

## Project boundaries

js-tetris is a vanilla-JavaScript and HTML5 Canvas browser game. Keep the browser runtime free of third-party libraries, frameworks, production dependencies, bundlers, and module migration. Proportionate, pinned development-only tooling is allowed. Propose substantial modernization in an issue before implementation.

[electris](https://github.com/jareddgotte/electris) is a divergent Electron successor. Its individual behavior or domain semantics may be evaluated as evidence, but never synchronize the repositories wholesale or copy its architecture for parity.

## Prerequisites and setup

Running the game requires only a modern browser and a static server; npm is not part of the browser runtime. Development checks require Node.js 22, npm, Python 3, and the pinned Playwright browser.

From a clean checkout, install the pinned development tooling without running package lifecycle scripts:

```sh
npm ci --ignore-scripts
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps chromium
```

The browser install command also installs required system packages on supported Debian/Ubuntu systems. On other platforms, follow Playwright's printed dependency guidance.

Serve the repository root, then open <http://localhost:8000/>:

```sh
python3 -m http.server 8000
```

The canonical `index.html` entry point requires no server-side processing.

## Development checks

Run the frozen checks tracked by `package.json` and the pull-request workflow:

```sh
npm run lint
npm test
npm run test:browser
```

`npm test` runs the deterministic Node test suite in `test/engine.test.js`. `npm run test:browser` serves the canonical page and verifies real computed panel geometry, narrow-screen clipping, and keyboard reachability in the pinned browser. To apply optional Standard Style fixes locally, run:

```sh
npm run format
```

Before submitting, also check the patch for whitespace errors:

```sh
git diff --check
```

## Changes and pull requests

- Start with an issue and keep each change focused on it. Discuss substantial modernization before coding.
- Add or update deterministic tests for changed behavior. Manual browser checks can supplement, but not replace, behavioral regression tests.
- Correct documentation made stale by the change in the same pull request.
- Maintain user-facing, workflow-facing, and agent-facing Markdown in `README.md`, `CONTRIBUTING.md`, and `AGENTS.md`.
- Do not check in generated JSDoc under `docs/` unless a concrete consumer and a reproducible pinned generation command both exist.
- Complete the pull-request template, including validation, relevant visual or accessibility evidence, risks, and explicit non-goals.

See `README.md` for user-facing project information and `AGENTS.md` for engine architecture and agent guidance.
