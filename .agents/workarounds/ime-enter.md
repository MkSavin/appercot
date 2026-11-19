---
anchor: WORKAROUND:ime-enter
rule: Treat keyCode 229 as composition when deciding whether Enter sends a message.
---

**Symptom.** Enter used to confirm an IME candidate can send the draft.

**Mechanism.** The final composition keydown can arrive after composition ends and report `isComposing: false`. The native keyboard event still identifies IME processing with code 229.

**Fix.** Check both `isComposing` and native `keyCode` before calling `preventDefault` or submitting. Checked: INV:ui/ignores-composition.

[MDN on keydown during IME composition](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event#keydown_events_with_ime)
