import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { FunctionResources, ResourceProvider } from '@aws-amplify/plugin-types';

export type AmplifyFunctionProps = {
  absoluteCodePath: string;
  runtime?: Runtime;
  handler?: string;
};

/**
 * Hello world construct implementation
 */
export class AmplifyFunction
  extends Construct
  implements ResourceProvider<FunctionResources>
{
  readonly resources: FunctionResources;
  /**
   * Create a new AmplifyConstruct
   */
  constructor(scope: Construct, id: string, props: AmplifyFunctionProps) {
    super(scope, id);

    this.resources = {
      function: new Function(this, `${id}LambdaFunction`, {
        code: Code.fromAsset(props.absoluteCodePath),
        runtime: props.runtime || Runtime.NODEJS_18_X,
        handler: props.handler || 'index.handler',
      }),
    };
  }
}
