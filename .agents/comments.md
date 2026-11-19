# Comments

Prefer a precise name, type or extracted function. Use inline comments for a reason that would be hard to recover from the line itself. Use JSDoc for caller obligations, errors and return semantics that the type cannot express. Put cross-method invariants in the module page and platform behavior in a workaround.

- Use English in source comments. Keep consecutive line comments to three lines and block comments to ten.
- Source comments reference living docs only via `@anchor DOC:<path>` in JSDoc on a class or a module factory named `create*`, `obtain*` or `make*`.
- In tests, put `@anchor INV:<test-file-stem>/<two-words>` immediately above `test(...)` or `it(...)`. Cite it in docs with `Checked: INV:…`. Use `Not checked automatically:` with a reason for untested claims.
- For platform exceptions, use `@anchor WORKAROUND:<slug> <reason>` at the protected code and a matching page under `workarounds/`. Use `code: none` with `why:` only when the rule has no code location.
- Use a code TODO only with a removal condition (`Remove when ...`). Record cross-cutting gaps in [Open gaps](todo.md) and remove resolved entries.
- Reproduce a workaround's symptom on its platform before removing it. Exercise changes on all supported platforms. Regenerate the index with `bun run docs:index`.
