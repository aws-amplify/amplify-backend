---
'@aws-amplify/hosting': minor
'@aws-amplify/backend-cli': patch
---

feat(hosting): adopt @aws-blocks/hosting 0.3.0 codec + @aws-blocks/pipeline 0.2.1 postStage hook

Bump `@aws-blocks/hosting` to `^0.3.0` and `@aws-blocks/pipeline` to `^0.2.1`, and
consume the new public APIs they add:

- **Managed-value JSON codec (C11):** `definePipeline` now serializes per-stage
  config with `@aws-blocks/hosting`'s `managedValueReplacer` and revives it in
  `getStageConfig` with `managedValueReviver`. `secret()`/`config()` markers placed
  in a stage's `config` now survive the `AMPLIFY_STAGE_CONFIG` transport (context
  and CodeBuild env) instead of silently losing their `Symbol` brand.
- **Public `postStage` hook (C13 + stage-source coupling):** the two-phase hosting
  deploy is now attached via `@aws-blocks/pipeline`'s public `postStage` prop.
  `AmplifyPipelineConstruct` becomes a thin re-export of the upstream `Pipeline`;
  the former private `_postStageHook`, the `-Stage-` construct-id source matching
  (`resolveSource`), and the wave-walking `applyPostStageHook` are removed. The
  upstream hook supplies the resolved pipeline source and guarantees a stage's
  `bakeTime` waits for the hosting deploy step (no longer racing it).

`_postStageHook` (an internal, `_`-prefixed prop) is removed from the exported
`PipelineProps`. `definePipeline` / `defineHosting` public signatures are unchanged.
