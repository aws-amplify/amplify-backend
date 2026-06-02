---
'@aws-amplify/hosting': patch
---

Astro adapter installs `@astrojs/node` with `--save` instead of `--no-save` so the dep is pinned in the user's `package.json` and survives an incremental redeploy on a fresh checkout. Previously a redeploy that ran `npm ci` without `@astrojs/node` already in `package.json` failed mid-build with `[NoAdapterInstalled] Cannot use server-rendered pages without an adapter`. Also makes the install step idempotent — re-running the adapter in the same process now skips when the dep is already present.
