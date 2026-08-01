js-tetris
============

The purpose of this repo is to demonstrate my knowledge of git on a public personal repo while upgrading my current, mostly functional, Tetris game which was made in JavaScript and HTML5 (no 3rd party js libraries allowed, e.g. jQuery).

## Development checks

The browser game remains dependency-free and continues to load `js/Tetris.js` and `js/TestCase.js` directly through script tags. The npm packages are development-only checks and require Node.js 22.

From a clean checkout, install the pinned tools from the lockfile and run all maintained JavaScript through Standard Style plus the deterministic engine tests:

```sh
npm ci --ignore-scripts
npm run lint
npm test
```

`npm test` runs the existing `node --test test/engine.test.js` suite and exits nonzero on failure. To apply Standard Style fixes locally, run:

```sh
npm run format
```
