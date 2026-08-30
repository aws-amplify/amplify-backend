---
'create-amplify': patch
---

fix(create-amplify): exit quietly when a prompt is cancelled with ctrl+c

`getProjectRoot` was awaited at module top level, outside the `try` that guards the rest of `npm create amplify`. Pressing ctrl+c at the "Where should we create your project?" prompt therefore rejected with an unhandled `ExitPromptError` and printed a stack trace. The prompt is now inside the same `try`, and a cancelled prompt exits without reporting an error, matching how the CLI's error handler treats it.
