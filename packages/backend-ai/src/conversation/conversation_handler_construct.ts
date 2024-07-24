import { ResourceProvider } from '@aws-amplify/plugin-types';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IFunction, Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path from 'path';

const resourcesRoot = path.normalize(path.join(__dirname, 'lambda'));
const defaultHandlerFilePath = path.join(resourcesRoot, 'default_handler.js');

export type ConversationHandlerProps = {
  modelId: string;
};

export type ConversationHandlerResources = {
  lambda: IFunction;
};

/**
 * TODO docs.
 */
export class ConversationHandler
  extends Construct
  implements ResourceProvider<ConversationHandlerResources>
{
  resources: ConversationHandlerResources;

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
        bundling: {
          bundleAwsSDK: true,
        },
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

    this.resources = {
      lambda: conversationHandler,
    };
  }
}
