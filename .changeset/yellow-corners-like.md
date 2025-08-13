---
'@aws-amplify/ai-constructs': minor
'@aws-amplify/backend-ai': minor
<<<<<<< HEAD
<<<<<<< HEAD
---

feat(ai): add cross-region inference support for AI conversation routes

- Add `AiModelArnGeneratorConstruct` + `AiModelPropsResolver` for region-aware model/inference-profile resolution.
- Conversation handler supports `crossRegionInference` and uses generated ARNs for IAM policies.
- Runtime (`BedrockConverseAdapter`) resolves foundation model vs inference profile ID using `AiModelPropsResolver`.
- Add `models.json` manifest and tests; update public exports.
=======
=======
'@aws-amplify/backend-function': patch
>>>>>>> 91e67ee83d (update changeset)
'create-amplify': patch
'@aws-amplify/platform-core': patch
---

feat(ai): add cross-region inference (CRI) support for conversation routes

- Added `AiModelArnGeneratorConstruct` + `AiModelPropsResolver` for resolving Bedrock model/inference profile ARNs based on region + CRI.
- `ConversationHandlerFunction` and runtime now support optional `crossRegionInference` in model configs and use generated ARNs for IAM policies.
- Exported new AI model construct/types from `@aws-amplify/ai-constructs/ai-model`.
- Updated tests, bundling config, and deps (`aws-cdk-lib` bump in create-amplify, `aws-lambda` dep).
- Minor telemetry schema adjustments in platform-core.
<<<<<<< HEAD
>>>>>>> cb44f64411 (docs: final changeset)
=======
- Add `jmespath` dependency needed by test to `backend-function`
>>>>>>> 91e67ee83d (update changeset)
