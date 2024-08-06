import { ResourceProvider } from '@aws-amplify/plugin-types';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CustomDataIdentifier,
  DataProtectionPolicy,
  LogGroup,
  RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path from 'path';

const resourcesRoot = path.normalize(path.join(__dirname, 'lambda'));
const defaultHandlerFilePath = path.join(resourcesRoot, 'default_handler.js');

export type ConversationHandlerProps = {
  entry?: string;
  allowedModels: Array<{
    modelId: string;
    region: string;
  }>;
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
        entry: this.props.entry ?? defaultHandlerFilePath,
        handler: 'handler',
        bundling: {
          bundleAwsSDK: true,
        },
        logGroup: new LogGroup(this, 'conversationHandlerLambdaLogGroup', {
          retention: RetentionDays.INFINITE,
          dataProtectionPolicy: new DataProtectionPolicy({
            identifiers: [
              new CustomDataIdentifier(
                'idToken',
                '[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*'
              ),
            ],
          }),
        }),
      }
    );

    if (this.props.allowedModels && this.props.allowedModels.length > 0) {
      const resources = this.props.allowedModels.map(
        (model) =>
          `arn:aws:bedrock:${model.region}::foundation-model/${model.modelId}`
      );
      conversationHandler.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['bedrock:InvokeModel'],
          resources,
        })
      );
    }

    this.resources = {
      lambda: conversationHandler,
    };
  }
}
