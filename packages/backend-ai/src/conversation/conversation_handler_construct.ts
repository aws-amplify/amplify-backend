import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { fileURLToPath } from 'node:url';
import path from 'path';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const resourcesRoot = path.normalize(path.join(dirname, 'lambda'));
const defaultHandlerFilePath = path.join(resourcesRoot, 'default_handler.js');

export type ConversationHandlerProps = {
  modelId: string;
};

/**
 * TODO docs.
 */
export class ConversationHandler extends Construct {
  /**
   * TODO docs.
   */
  constructor(
    scope: Construct,
    id: string,
    private readonly props: ConversationHandlerProps
  ) {
    super(scope, id);

    const conversationHandler = new NodejsFunction(
      this,
      `conversationHandlerLambda`,
      {
        runtime: LambdaRuntime.NODEJS_18_X,
        timeout: Duration.seconds(60),
        entry: defaultHandlerFilePath,
        handler: 'handler',
      }
    );

    conversationHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:us-west-2::foundation-model/${props.modelId}`,
        ],
      })
    );
  }
}
