---
'@aws-amplify/hosting': patch
---

fix(hosting): clear stale .open-next cache before OpenNext build

Prevents esbuild errors from leftover artifacts when deploying repeatedly.
