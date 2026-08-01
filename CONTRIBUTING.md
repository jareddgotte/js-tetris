# Contributing

## Project boundaries

js-tetris is a vanilla-JavaScript and HTML5 Canvas browser game. Keep the browser runtime free of third-party libraries, frameworks, production dependencies, bundlers, and module migration. Proportionate, pinned development-only tooling is allowed. Propose substantial modernization in an issue before implementation.

[electris](https://github.com/jareddgotte/electris) is a divergent Electron successor. Its individual behavior or domain semantics may be evaluated as evidence, but never synchronize the repositories wholesale or copy its architecture for parity.

## Prerequisites and setup

Running the game requires only a modern browser and a static server; npm is not part of the browser runtime. Development checks require Node.js 22 and npm.

From a clean checkout, install the pinned development tooling without running package lifecycle scripts:

```sh
npm ci --ignore-scripts
```

Serve the repository root, then open <http://localhost:8000/index.php>:

```sh
python3 -m http.server 8000
```

`index.php` contains static HTML and requires no PHP processing.

## Development checks

Run the frozen checks tracked by `package.json` and the pull-request workflow:

```sh
npm run lint
npm test
```

`npm test` runs the deterministic Node test suite in `test/engine.test.js`. To apply optional Standard Style fixes locally, run:

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
- Correct documentation made stale by the change in the same pull request. Do not hand-edit generated JSDoc under `docs/`.
- Complete the pull-request template, including validation, relevant visual or accessibility evidence, risks, and explicit non-goals.

See `README.md` for user-facing project information and `AGENTS.md` for engine architecture and agent guidance.
