---
'@aws-amplify/backend': minor
'@aws-amplify/backend-cli': minor
'@aws-amplify/backend-data': minor
'@aws-amplify/backend-deployer': minor
'@aws-amplify/backend-storage': minor
'@aws-amplify/hosting': minor
'@aws-amplify/platform-core': minor
'@aws-amplify/ai-constructs': patch
'@aws-amplify/auth-construct': patch
'@aws-amplify/backend-ai': patch
'@aws-amplify/backend-auth': patch
'@aws-amplify/backend-function': patch
'@aws-amplify/backend-output-storage': patch
'@aws-amplify/cli-core': patch
'@aws-amplify/client-config': patch
'@aws-amplify/deployed-backend-client': patch
'@aws-amplify/form-generator': patch
'@aws-amplify/integration-tests': patch
'@aws-amplify/model-generator': patch
'@aws-amplify/plugin-types': patch
'@aws-amplify/sandbox': patch
'@aws-amplify/seed': patch
---

feat: standalone SSR hosting for Gen 2 backends

Adds `defineHosting` to `@aws-amplify/hosting` — a framework-agnostic L3 construct (Next.js, Nuxt/Nitro, Astro, SPA) that deploys SSR/SSG apps on CloudFront + Lambda via an OpenNext build, KVS edge routing, ISR cache seeding, multi-domain/WAF, and configurable cache/headers, all re-exported from `@aws-blocks/hosting`. Extends the `ampx` CLI with `--backend`/`--frontend` deploy flags and backend/hosting entry-point discovery so a single command deploys both. Introduces `definePipeline` for CI/CD — a self-mutating CodePipeline (one per branch) with a two-phase backend-then-hosting deploy, delegated to `@aws-blocks/pipeline`. Aligns the workspace `aws-cdk-lib` peer floor to `^2.257.0` to match the aws-blocks constructs.
