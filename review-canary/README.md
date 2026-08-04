# Disposable review canary — do not merge

This isolated utility and its tests exercise review automation only.
It is not loaded by `index.html` and has no browser runtime effect.
The CommonJS export exists only so the deterministic Node test can load it.
This experimental branch and pull request must never merge.
