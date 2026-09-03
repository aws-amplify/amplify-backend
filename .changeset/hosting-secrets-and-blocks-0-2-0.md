---
'@aws-amplify/hosting': minor
---

feat(hosting): self-managed secrets & config + `@aws-blocks/hosting` 0.2.0

Adds `secret()` (AWS Secrets Manager) and `config()` (SSM Parameter Store) to `defineHosting`'s `environment`, read at runtime with `getSecret`/`getConfig` from the CDK-free `@aws-amplify/hosting/runtime` entry. `byoSecret()`/`byoConfig()` reference existing store entries with no user CDK. Only the store locator is injected into compute — never the value. Store namespaces default to `/amplify/hosting/<project>/{secrets,config}`, overridable via `secretStore`/`configStore`.

Bumps the vendored `@aws-blocks/hosting` and `@aws-blocks/pipeline` to `^0.2.0`, whose `.` entry is the CDK-free value API (hosting/manifest types moved to the `/constructs` entry); the internal re-export shims are repointed accordingly and the public API is unchanged.
