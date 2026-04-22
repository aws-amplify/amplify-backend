---
'@aws-amplify/sandbox': patch
---

fix: maintain custom sandbox identifier after file changes

The sandbox identifier provided via --identifier flag now persists throughout the entire session, including after file changes trigger rebuilds. Previously, the identifier would fall back to the default (whoami) value after file changes.
