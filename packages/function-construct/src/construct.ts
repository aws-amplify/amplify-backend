import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { AmplifyFunction, FunctionResources } from '@aws-amplify/plugin-types';

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
  }
}
