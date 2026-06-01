---
'@aws-amplify/hosting': patch
---

Emit a stderr warning at adapter time when the installed `@opennextjs/aws` version is outside the range our streaming-wrapper and edge-bundle patchers have been explicitly verified against. The patcher itself still throws `UpstreamPatchPatternChangedError` if signatures shift — the warning just makes the cause obvious _before_ the patcher fires, so users hitting a fresh OpenNext release know to expect a possible patch break.
