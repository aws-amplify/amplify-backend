---
'@aws-amplify/hosting': minor
---

fix(hosting): pin pipeline CodeBuild steps to Node.js 22 runtime

The pipeline synth and hosting deploy steps now explicitly specify
Node.js 22 (current LTS) via `partialBuildSpec` runtime-versions.
Previously, CodeBuild defaulted to Node 18 which is EOL.

Users can override via `synth.partialBuildSpec` if needed.
