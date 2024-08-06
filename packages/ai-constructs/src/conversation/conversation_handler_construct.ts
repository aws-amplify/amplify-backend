import { FunctionResources, ResourceProvider } from '@aws-amplify/plugin-types';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnFunction, Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CustomDataIdentifier,
  DataProtectionPolicy,
  LogGroup,
  RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path from 'path';

const resourcesRoot = path.normalize(path.join(__dirname, 'runtime'));
const defaultHandlerFilePath = path.join(resourcesRoot, 'default_handler.js');

export type ConversationHandlerFunctionProps = {
  entry?: string;
  models: Array<{
    modelId: string;
    region: string;
  }>;
};

/**
 * TODO docs.
 */
export class ConversationHandlerFunction
  extends Construct
  implements ResourceProvider<FunctionResources>
{
  resources: FunctionResources;

  /**
   * TODO docs.
   */
  constructor(
    scope: Construct,
    id: string,
    private readonly props: ConversationHandlerFunctionProps
  ) {
    super(scope, id);

    const conversationHandler = new NodejsFunction(
      this,
      `conversationHandlerFunction`,
      {
        runtime: LambdaRuntime.NODEJS_18_X,
        timeout: Duration.seconds(60),
        entry: this.props.entry ?? defaultHandlerFilePath,
        handler: 'handler',
        bundling: {
          bundleAwsSDK: true,
        },
        logGroup: new LogGroup(this, 'conversationHandlerFunctionLogGroup', {
          retention: RetentionDays.INFINITE,
          dataProtectionPolicy: new DataProtectionPolicy({
            identifiers: [
              new CustomDataIdentifier(
                'idToken',
                'ey[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*'
              ),
            ],
          }),
        }),
      }
    );

    if (this.props.models && this.props.models.length > 0) {
      const resources = this.props.models.map(
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
      cfnResources: {
        cfnFunction: conversationHandler.node.findChild(
          'Resource'
        ) as CfnFunction,
      },
    };
  }
}
