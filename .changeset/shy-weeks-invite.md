---
'@aws-amplify/backend-deployer': patch
'@aws-amplify/sandbox': patch
'create-amplify': patch
'@aws-amplify/ai-constructs': patch
'@aws-amplify/backend-ai': patch
'@aws-amplify/backend-auth': patch
'@aws-amplify/backend-function': patch
'@aws-amplify/backend-output-storage': patch
'@aws-amplify/backend-storage': patch
'@aws-amplify/backend': patch
'@aws-amplify/cli-core': patch
'@aws-amplify/backend-cli': patch
'@aws-amplify/client-config': patch
'@aws-amplify/deployed-backend-client': patch
'@aws-amplify/form-generator': patch
'@aws-amplify/model-generator': patch
'@aws-amplify/platform-core': patch
'@aws-amplify/plugin-types': patch
'@aws-amplify/seed': patch
---

Fix high and critical Dependabot vulnerabilities: upgrade @aws-sdk/client-bedrock-runtime in ai-constructs to fix fast-xml-parser CRITICAL vulnerability, remove all npm overrides in favor of direct dependency upgrades.
