---
'@aws-amplify/backend-notifications': major
'@aws-amplify/backend': minor
'@aws-amplify/backend-cli': minor
'@aws-amplify/backend-data': minor
'@aws-amplify/backend-deployer': minor
'@aws-amplify/backend-storage': minor
'@aws-amplify/hosting': minor
'@aws-amplify/platform-core': minor
'create-amplify': minor
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

feat: standalone SSR hosting + self-managed secrets/config for Gen 2

- `defineHosting` / `definePipeline`: framework-agnostic SSR/SSG (Next, Nuxt/Nitro, Astro, SPA) on CloudFront + Lambda, plus a self-mutating CI/CD pipeline (via `@aws-blocks` 0.2.0). `ampx deploy` gains `--backend`/`--frontend` and defaults `--identifier` to the `package.json` name.
- Self-managed values: `secret()` (Secrets Manager) / `config()` (SSM), read at runtime with `getSecret`/`getConfig` (CDK-free `@aws-amplify/hosting/runtime`); `byoSecret()`/`byoConfig()` for existing entries; `ampx secret` / `ampx config` CLI.
- Raise `aws-cdk-lib` peer floor to `^2.257.0` and `constructs` to `^10.6.0`; bump `@aws-cdk/toolkit-lib` to 1.40.0 so a hotswap fallback stays in STANDARD mode.
- **Breaking (`@aws-amplify/backend-notifications`):** `defineNotifications` now requires a Customer Profiles domain with Identity Resolution disabled (rejected at deploy and request time otherwise).
- Fix (`ai-constructs`): strip extra Bedrock tool-use fields before the AppSync mutation.
