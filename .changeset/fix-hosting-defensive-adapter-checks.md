---
'@aws-amplify/hosting': patch
---

Defensive adapter checks: throw on `_amplify-cache.mjs` collision instead of silently overwriting user code, prune `node_modules/.nitro` cyclic symlinks before CDK hashes the Lambda asset (fixes ENAMETOOLONG on macOS + Nitro 2.13.4+), honor `output.serverDir`/`output.publicDir` from `nitro.json` instead of hardcoding paths, and throw `IncompatibleOpenNextConfigError` when a user-authored `open-next.config.ts` lacks the API-Gateway converter or streaming wrapper overrides instead of warning and shipping a broken deploy.
