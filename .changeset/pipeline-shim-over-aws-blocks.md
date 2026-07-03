---
'@aws-amplify/hosting': patch
---

refactor(hosting): make the pipeline module a thin shim over `@aws-blocks/pipeline`

`AmplifyPipelineConstruct` now extends `@aws-blocks/pipeline`'s `Pipeline` and
re-exports the shared config types + `DeployStage` from it, replacing the
from-scratch fork. The Amplify-specific two-phase hosting deploy is preserved
via the internal `_postStageHook`. Also upgrades `@aws-blocks/hosting` to
`^0.1.4`. Public API is unchanged.
