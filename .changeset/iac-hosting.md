---
'@aws-amplify/backend': minor
'@aws-amplify/backend-cli': minor
'create-amplify': minor
'@aws-amplify/backend-data': minor
'@aws-amplify/backend-deployer': minor
'@aws-amplify/backend-storage': minor
'@aws-amplify/hosting': minor
'@aws-amplify/platform-core': minor
'@aws-amplify/ai-constructs': minor
'@aws-amplify/auth-construct': minor
'@aws-amplify/backend-ai': minor
'@aws-amplify/backend-auth': minor
'@aws-amplify/backend-function': minor
'@aws-amplify/backend-output-storage': minor
'@aws-amplify/cli-core': patch
'@aws-amplify/client-config': patch
'@aws-amplify/deployed-backend-client': patch
'@aws-amplify/form-generator': patch
'@aws-amplify/integration-tests': patch
'@aws-amplify/model-generator': patch
'@aws-amplify/plugin-types': minor
'@aws-amplify/sandbox': patch
'@aws-amplify/seed': patch
---

feat: standalone SSR hosting & CI/CD for Gen 2

- **`defineHosting`** (`@aws-amplify/hosting`) — framework-agnostic SSR/SSG (Next.js, Nuxt/Nitro, Astro, SPA) on CloudFront + Lambda via an OpenNext build (KVS edge routing, ISR cache seeding, image optimization, multi-domain/WAF, cache/headers, skew protection), built on `@aws-blocks/hosting` 0.2.0.
- **`definePipeline`** (`@aws-amplify/hosting/pipeline`) — a self-mutating CodePipeline (one per branch) with a two-phase backend-then-hosting deploy and typed per-stage config, built on `@aws-blocks/pipeline` 0.2.0.
- **Self-managed values** — `secret()` (AWS Secrets Manager) / `config()` (SSM Parameter Store) in `defineHosting`'s `environment`, read at runtime with `getSecret`/`getConfig` from the CDK-free `@aws-amplify/hosting/runtime` entry; `byoSecret()`/`byoConfig()` reference existing entries with no user CDK. Only the store locator is injected into compute — never the value; namespaces default to `/amplify/hosting/<project>/{secrets,config}`.
- **CLI** — `ampx deploy` gains `--backend`/`--frontend` and defaults `--identifier` to the sanitized `package.json` name; new `ampx secret` / `ampx config` (`set`/`get`/`list`/`remove`) manage self-managed hosting values.
