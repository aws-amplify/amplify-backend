---
'@aws-amplify/ai-constructs': patch
---

fix(ai-constructs): handle reasoning content blocks from Bedrock Converse

Claude models that think by default (e.g. Claude Sonnet 5.5) return
`reasoningContent` blocks. The streaming adapter turned each of them into an
empty text block, which Bedrock rejected on the next request of the tool use
loop ("text content blocks must be non-empty") and which was persisted, so every
later turn of the conversation failed too. The non-streaming adapter returned
them to AppSync, whose input types don't accept them.

Reasoning blocks are now kept unchanged in the tool use loop and left out of the
client facing response. Empty text blocks already persisted next to other
content are skipped when the message history is loaded.
