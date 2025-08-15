---
'@aws-amplify/ai-constructs': minor
'@aws-amplify/backend-ai': minor
---

feat(ai): add cross-region inference support for AI conversation routes

- Add `AiModelArnGeneratorConstruct` + `AiModelPropsResolver` for region-aware model/inference-profile resolution.
- Conversation handler supports `crossRegionInference` and uses generated ARNs for IAM policies.
- Runtime (`BedrockConverseAdapter`) resolves foundation model vs inference profile ID using `AiModelPropsResolver`.
- Add `models.json` manifest and tests; update public exports.