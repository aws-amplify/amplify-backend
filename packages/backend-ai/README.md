# Description

This package contains entry points for customers to define resources which power AI routes in Amplify apps.
This is a layer on top of the AI constructs in `@aws-amplify/ai-constructs` to initialize the construct in the context of an Amplify backend

# `defineConversationHandlerFunction`

`defineConversationHandlerFunction` can be used to provision custom resources required to integrate conversation routes (i.e.
defined with `a.ai.conversation()` from `@aws-amplify/data-schema`) with AI models provided by AWS Bedrock service.

## Examples

```typescript
import { defineConversationHandlerFunction } from '@aws-amplify/backend-ai/conversation';

export const customConversationHandlerFunction =
  defineConversationHandlerFunction({
    name: 'customConversationHandlerFunction',
    entry: './custom_handler.ts',
    models: [
      {
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        region: 'us-east-1',
      },
    ],
  });
```
