# Description

This package vends L3 CDK Constructs that deploy resources which power AI routes in Amplify apps.

# Conversation Handler Function

Conversation Handler Function L3 CDK Construct provisions resources required to integrate conversation routes (i.e.
defined with `a.ai.conversation()` from `@aws-amplify/data-schema`) with AI models provided by AWS Bedrock service.

Resources deployed by this construct include:

1. AWS Lambda function that:
   1. Accepts conversation turn events coming from upstream AWS AppSync instance that is hosting conversation routes
      in a form of GraphQL schemas.
   2. Interacts with AWS Bedrock to elicit a response to current conversation turn.
   3. Sends back the response to the same AWS AppSync instance in a form of GraphQL mutation.
2. AWS CloudWatch Log Group associated with AWS Lambda function with addition of appropriate data protection policy.
3. AWS IAM Policy that grants access to selected AWS Bedrock models.

This construct is used implicitly by `@aws-amplify/data-construct` when conversational routes don't specify
handler reference. In this case default implementation provided by Amplify is deployed.

Alternatively, a custom lambda implementation can be provided by explicitly including this construct in backend definition
and referencing it in schema.

## Examples

### Default implementation

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { ConversationHandlerFunction } from '@aws-amplify/ai-constructs/conversation';

const app = new App();
const stack = new Stack(app, 'ConversationHandlerStack');

new ConversationHandlerFunction(stack, {
  models: [
    {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      region: 'us-east-1',
    },
  ],
});
```

### Custom implementation

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { ConversationHandlerFunction } from '@aws-amplify/ai-constructs/conversation';
import path from 'path';

const app = new App();
const stack = new Stack(app, 'ConversationHandlerStack');

new ConversationHandlerFunction(stack, {
  entry: path.resolve('./custom_handler.ts'),
  models: [
    {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      region: 'us-east-1',
    },
  ],
});
```
