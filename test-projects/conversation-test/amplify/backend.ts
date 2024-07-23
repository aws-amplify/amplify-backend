import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { conversationHandler, data } from './data/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  conversationHandler,
});

// temporary
const bedrockModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
backend.conversationHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:us-west-2::foundation-model/${bedrockModelId}`,
    ],
  })
);
