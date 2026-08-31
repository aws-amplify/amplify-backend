---
'@aws-amplify/ai-constructs': patch
---

fix(ai-constructs): strip extra Bedrock tool use fields before sending to AppSync

`ConversationTurnResponseSender.serializeContent` spread the entire Bedrock
`ToolUseBlock` into the AppSync mutation. Newer `@aws-sdk/client-bedrock-runtime`
versions add fields (e.g. `type`) that are not part of the generated
`AmplifyAIToolUseBlockInput`, causing the conversation handler to fail with
"Field 'type' is not defined by type 'AmplifyAIToolUseBlockInput'" whenever a
tool (such as a `responseComponents` tool) is invoked. Only `toolUseId`, `name`,
and the stringified `input` are now forwarded.
