---
'@aws-amplify/hosting': minor
---

feat(hosting): self-managed secrets & config for `defineHosting` / `definePipeline`

Adds a self-hosted value API to `@aws-amplify/hosting` (and `@aws-amplify/hosting/pipeline`):

- `secret('KEY')` — reference a sensitive value in **AWS Secrets Manager**; read at runtime with `getSecret('KEY')`.
- `config('KEY')` — reference a non-sensitive value in **SSM Parameter Store** (e.g. a domain, feature flag, connection ARN); read at runtime with `getConfig('KEY')`.

`defineHosting`'s `environment` now accepts these markers (and BYO `ISecret` / `IParameter` handles) in addition to plain strings — only the store locator is injected into the compute Lambdas (never the value) and the compute role is granted least-privilege read + decrypt. Values are set out of band and read at runtime, so they never enter source or the CloudFormation template. Per-kind store namespaces default to `/amplify/hosting/<project>/secrets` and `/amplify/hosting/<project>/config`, overridable via the new `secretStore` / `configStore` options.

Runtime code (SSR routes/Lambdas) reads values via the CDK-free
`@aws-amplify/hosting/runtime` entry, so `getSecret`/`getConfig` never pull
`aws-cdk-lib` into a server bundle.

This is distinct from `secret()` in `@aws-amplify/backend` (Amplify-managed backends, SSM SecureString scoped by app-id/branch), which does not apply to self-hosted (`ampx deploy` / `definePipeline`) deployments.
