---
'@aws-amplify/ai-constructs': minor
---

Add support for regional Bedrock inference profiles in conversation handler IAM policies. Model IDs with geographic prefixes (us., eu., apac., au., ca., jp., us-gov.) are now correctly identified as inference profiles and receive the appropriate `inference-profile/` ARN format with account ID, plus access to the underlying foundation model. Global inference profiles (global. prefix) continue to receive the existing three-part IAM policy. A CDK warning is emitted during synth when inference profiles are used, directing developers to the Bedrock docs for region availability.
