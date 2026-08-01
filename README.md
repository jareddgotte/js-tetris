js-tetris
============

The purpose of this repo is to demonstrate my knowledge of git on a public personal repo while upgrading my current, mostly functional, Tetris game which was made in JavaScript and HTML5 (no 3rd party js libraries allowed, e.g. jQuery).

## Regression tests

The headless engine tests require Node.js 18 or newer and have no install step or external dependencies. Run them offline from the repository root:

```sh
node --test test/engine.test.js
```

The command exits nonzero when a test fails. The browser game continues to load `js/Tetris.js` and `js/TestCase.js` directly through script tags.
