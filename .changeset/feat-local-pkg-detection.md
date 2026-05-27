---
'@aws-amplify/hosting': minor
---

Detect frameworks and read the Astro version gate from actually-installed packages (`local-pkg`) instead of `package.json` spec ranges. Closes three classes of bug: declared-but-not-installed (e.g. `npm install` skipped) no longer auto-detects; non-semver specs (`workspace:*`, `file:../fork`, `latest`) work because the resolver reads `node_modules/<pkg>/package.json#version`; and silent version drift between the spec and the installed copy is now caught at adapter time.
