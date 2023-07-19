import { Construct } from 'constructs';
import { Code, Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';

export type AmplifyFunctionProps = {
  absoluteCodePath: string;
  runtime?: Runtime;
  handler?: string;
};

/**
 * Hello world construct implementation
 */
export class AmplifyFunction extends Construct {
  readonly lambda: IFunction;
  /**
   * Create a new AmplifyConstruct
   */
  constructor(scope: Construct, id: string, props: AmplifyFunctionProps) {
    super(scope, id);

    this.lambda = new Function(this, `${id}LambdaFunction`, {
      code: Code.fromAsset(props.absoluteCodePath),
      runtime: props.runtime || Runtime.NODEJS_18_X,
      handler: props.handler || 'index.handler',
    });
  }
}
