---
'@aws-amplify/hosting': patch
---

Fix deploying more than one edge-runtime route (e.g. edge middleware + an edge
route) on stacks outside us-east-1. `experimental.EdgeFunction` hoists every
instance into a single shared `edge-lambda-stack`; the literal `'EdgeFunction'`
child id collided on the second edge compute ("already a Construct with name
'EdgeFunction'"). The id is now scoped per compute (`EdgeFunction-<name>`).
Also fixes a second cross-region failure surfaced by the same path: the
stack-region `LogGroup` is no longer passed to the edge function (it hoists to
us-east-1, so a cross-environment LogGroup reference broke synth) — Lambda@Edge
writes logs in its replica regions under their own log groups.
