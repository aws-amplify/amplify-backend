import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  type AmplifyFunction,
  type FunctionResources,
} from '@aws-amplify/plugin-types';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { Stack } from 'aws-cdk-lib';
import { fileURLToPath } from 'url';

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Function in BI metrics
const functionStackType = 'function-Lambda';

export type AmplifyFunctionProps = {
  absoluteCodePath: string;
  runtime?: Runtime;
  handler?: string;
};

/**
 * Hello world construct implementation
 */
export class AmplifyLambdaFunction
  extends Construct
  implements AmplifyFunction
{
  readonly resources: FunctionResources;
  /**
   * Create a new AmplifyConstruct
   */
  constructor(scope: Construct, id: string, props: AmplifyFunctionProps) {
    super(scope, id);

    this.resources = {
      lambda: new Function(this, `${id}LambdaFunction`, {
        code: Code.fromAsset(props.absoluteCodePath),
        runtime: props.runtime || Runtime.NODEJS_18_X,
        handler: props.handler || 'index.handler',
      }),
    };

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      functionStackType,
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
  }
}
