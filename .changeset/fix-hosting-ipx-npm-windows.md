---
'@aws-amplify/hosting': patch
---

Resolve `npm` on Windows when installing image-optimization (ipx + sharp) Lambda dependencies. Pass `shell: true` so Windows can resolve `npm` -> `npm.cmd` via `PATHEXT`. Without this, the IPX bundle install in the Nitro adapter fails on Windows with `Error: spawnSync npm ENOENT`, surfacing as `[ImageOptimizationBundleError] Failed to install image-optimization dependencies`.
