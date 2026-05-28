---
'@aws-amplify/hosting': minor
---

Migrate `@aws-amplify/hosting` from CommonJS to ESM (`"type": "module"`, `module: NodeNext`) and replace the `child_process.execFileSync` calls in the Next.js, Nitro, and Astro adapters with [`execa`](https://github.com/sindresorhus/execa). Resolves the CodeQL `js/shell-command-constructed-from-input` alert by removing `shell: true` from build-time spawns; execa handles Windows `npm`/`npx` → `.cmd` resolution without invoking a shell parser.
