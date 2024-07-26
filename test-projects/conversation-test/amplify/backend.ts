import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { dualChatHandler } from './dualChatHandler/resource';
import { data } from './data/resource';
import { evilChatHandler } from './evilChatHandler/resource';
import { smartEvilChatHandler } from './smartEvilChatHandler/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  evilChatHandler,
  smartEvilChatHandler,
  dualChatHandler,
});

// temporary
const bedrockModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
backend.smartEvilChatHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:*::foundation-model/${bedrockModelId}`,
    ],
  })
);
