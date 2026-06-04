---
'@aws-amplify/hosting': patch
---

fix(hosting): add explicit LogGroup to revalidation Lambda

The ISR revalidation worker Lambda was the only function in the hosting
construct still relying on Lambda's auto-created log group (no retention
policy). This adds an explicit `AWS::Logs::LogGroup` with the same
`compute.logRetention` (default TWO_WEEKS) and `RemovalPolicy.DESTROY`
that all other compute functions already use via ComputeConstruct.

Prevents unbounded log growth in accounts with ISR-enabled deployments.
