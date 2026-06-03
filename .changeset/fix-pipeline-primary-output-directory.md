---
'@aws-amplify/hosting': patch
---

fix(hosting): default primaryOutputDirectory to 'cdk.out' in pipeline construct

When users call `definePipeline()` without specifying `synth.primaryOutputDirectory`,
the ShellStep's `primaryOutputDirectory` was `undefined`. This caused the CDK Pipelines
synth step to fail to find the cloud assembly output because `npx tsx amplify/pipeline.ts`
writes to `cdk.out/` by default but the ShellStep didn't know to look there.

Also sets explicit `outdir: 'cdk.out'` in the App constructor within `definePipeline()` to
ensure synthesis output goes to a deterministic location when invoked directly (not via
`cdk` CLI which sets `CDK_OUTDIR` automatically).
