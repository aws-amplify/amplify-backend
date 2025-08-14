---
'@aws-amplify/ai-constructs': minor
'@aws-amplify/backend': patch
'@aws-amplify/backend-ai': minor
'@aws-amplify/backend-function': patch
'create-amplify': patch
---

feat(ai): add cross-region inference (CRI) support for conversation routes

- Added `AiModelArnGeneratorConstruct` + `AiModelPropsResolver` for resolving Bedrock model/inference profile ARNs based on region + CRI.
- `ConversationHandlerFunction` and runtime now support optional `crossRegionInference` in model configs and use generated ARNs for IAM policies.
- Exported new AI model construct/types from `@aws-amplify/ai-constructs/ai-model`.
- Updated tests, bundling config, and deps (`aws-cdk-lib` bump in create-amplify, `aws-lambda` dep).
- Add `jmespath` dependency needed by test to `backend-function`
