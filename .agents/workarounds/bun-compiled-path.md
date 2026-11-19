---
anchor: WORKAROUND:bun-compiled-path
rule: Resolve adjacent deployment assets relative to the executable inside a compiled Bun bundle.
---

**Symptom.** A compiled server cannot find its adjacent `drizzle/` migrations or `public/` assets.

**Mechanism.** In a compiled build, module metadata can point to the Bun virtual filesystem rather than the folder with the executable.

**Fix.** Detect the Windows and Unix virtual paths and use the directory of `process.execPath`. Checked: INV:packaging/uses-executable.

[Runtime path resolver](../../apps/server/src/runtime.ts) · [Packaging test](../../apps/server/test/packaging.test.ts)
