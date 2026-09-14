# @aws-amplify/hosting

## 1.0.1

### Patch Changes

- 4533496: docs: refresh README for the 1.0 API
  - Add SvelteKit to the built-in adapters table and exports, and stop listing it as "not built in".
  - Mention Nuxt/Astro/SvelteKit SSR in the intro and complete the `framework` union.
  - Document secrets & environment variables (`secret()`/`config()`/`byoSecret()`/`byoConfig()`, `ampx secret|config set`, `getSecret`/`getConfig` from `@aws-amplify/hosting/runtime`, store namespaces).
  - Document self-managed CI/CD via `definePipeline()` (source, branches/stages, `bakeTime`, `synth`, `crossAccountKeys`, `selfMutation`, `getStageConfig()`), and reframe the `ampx pipeline-deploy` note accordingly.
  - Add the default-on `monitoring` and `skewProtection` options and `buildOutputDir` to the configuration table.

## 1.0.0

### Major Changes

- 02be24d: feat: standalone SSR hosting & CI/CD for Gen 2
  - **`defineHosting`** (`@aws-amplify/hosting`) — framework-agnostic SSR/SSG (Next.js, Nuxt/Nitro, Astro, SPA) on CloudFront + Lambda via an OpenNext build (KVS edge routing, ISR cache seeding, image optimization, multi-domain/WAF, cache/headers, skew protection), built on `@aws-blocks/hosting` 0.3.0.
  - **`definePipeline`** (`@aws-amplify/hosting/pipeline`) — a self-mutating CodePipeline (one per branch) with a two-phase backend-then-hosting deploy and typed per-stage config, built on `@aws-blocks/pipeline` 0.2.1.
  - **Self-managed values** — `secret()` (AWS Secrets Manager) / `config()` (SSM Parameter Store) in `defineHosting`'s `environment`, read at runtime with `getSecret`/`getConfig` from the CDK-free `@aws-amplify/hosting/runtime` entry; `byoSecret()`/`byoConfig()` reference existing entries with no user CDK. Only the store locator is injected into compute — never the value; namespaces default to `/amplify/hosting/<project>/{secrets,config}`.
  - **CLI** — `ampx deploy` gains `--backend`/`--frontend` and defaults `--identifier` to the sanitized `package.json` name; new `ampx secret` / `ampx config` (`set`/`get`/`list`/`remove`) manage self-managed hosting values.

### Patch Changes

- Updated dependencies [02be24d]
- Updated dependencies [a0421b3]
  - @aws-amplify/platform-core@1.12.0
  - @aws-amplify/backend-output-storage@1.4.0
  - @aws-amplify/plugin-types@1.13.0
