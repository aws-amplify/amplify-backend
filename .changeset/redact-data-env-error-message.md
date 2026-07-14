---
'@aws-amplify/backend-function': patch
'@aws-amplify/backend': patch
---

fix(backend-function): avoid serializing the full environment in the malformed data-env error

When the data environment variables are missing or malformed, `getAmplifyDataClientConfig` no longer serializes the entire runtime environment into the thrown error. The message now lists only the names of the missing/malformed variables, which keeps it debuggable without including unrelated environment values.
