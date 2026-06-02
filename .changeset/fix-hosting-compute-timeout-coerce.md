---
'@aws-amplify/hosting': patch
---

fix(hosting): accept `compute.timeout` as `Duration | number` and coerce; defensive throw in ComputeConstruct when an internal caller passes a non-Duration. Surfaced by AWS Blocks bug-bash repro where a JS-compiled wrapper passed `timeout: 30` (a plain number) and crashed synth deep in aws-cdk-lib with `props.timeout.toSeconds is not a function`.
