---
'@aws-amplify/hosting': patch
---

docs: refresh README for the 1.0 API

- Add SvelteKit to the built-in adapters table and exports, and stop listing it as "not built in".
- Mention Nuxt/Astro/SvelteKit SSR in the intro and complete the `framework` union.
- Document secrets & environment variables (`secret()`/`config()`/`byoSecret()`/`byoConfig()`, `ampx secret|config set`, `getSecret`/`getConfig` from `@aws-amplify/hosting/runtime`, store namespaces).
- Document self-managed CI/CD via `definePipeline()` (source, branches/stages, `bakeTime`, `synth`, `crossAccountKeys`, `selfMutation`, `getStageConfig()`), and reframe the `ampx pipeline-deploy` note accordingly.
- Add the default-on `monitoring` and `skewProtection` options and `buildOutputDir` to the configuration table.
