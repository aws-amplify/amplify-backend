import { Duration, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { z } from 'zod';
import {
  ConstructAdaptor,
  ConstructAdaptorFactory,
  AmplifyInitializer,
  LambdaEventHandler,
  RuntimeAccessAttacher,
  RuntimeResourceInfo,
  SecretHandler,
  AmplifySecret,
} from '../../types';

export const init: AmplifyInitializer = () => {
  return new AmplifyLambdaProviderFactory();
};

class AmplifyLambdaProviderFactory implements ConstructAdaptorFactory {
  constructor() {}

  getConstructAdaptor(scope: Construct, name: string): ConstructAdaptor {
    return new AmplifyLambdaProvider(scope, name);
  }

  getDefinitionSchema(): z.AnyZodObject {
    return z.object({});
  }
}

class AmplifyLambdaProvider extends ConstructAdaptor implements LambdaEventHandler, RuntimeAccessAttacher, SecretHandler {
  private static readonly runtimeRoleToken = 'lambdaRuntime';
  private func: lambda.Function;
  constructor(scope: Construct, private readonly name: string) {
    super(scope, name);
  }

  getDefinitionSchema() {
    return inputSchema;
  }

  init(configuration: FunctionConfig) {
    this.func = new lambda.Function(this, this.name, {
      runtime: new lambda.Runtime(configuration.runtime),
      handler: configuration.handler,
      timeout: typeof configuration.timeoutSeconds === 'number' ? Duration.seconds(configuration.timeoutSeconds) : undefined,
      code: lambda.Code.fromAsset(configuration.codePath),
    });
  }

  finalizeResources(): void {
    // intentional noop
  }

  getLambdaRef(): lambda.IFunction {
    return this.func;
  }

  attachRuntimePolicy(
    runtimeRoleToken: string,
    policy: iam.PolicyStatement,
    { resourceName, physicalNameToken, arnToken }: RuntimeResourceInfo
  ): void {
    if (runtimeRoleToken !== 'lambdaRuntime') {
      throw new Error(`Unknown runtimeRoleToken ${runtimeRoleToken} found when generating access policy`);
    }
    this.func.addToRolePolicy(policy);
    /*
    NOTE: Changing the keys here would be a breaking change for existing lambdas
    */
    this.func.addEnvironment(`${resourceName}_Name`, physicalNameToken);
    this.func.addEnvironment(`${resourceName}_Arn`, arnToken);
  }

  acceptSecret(_name: string, secret: AmplifySecret): void {
    secret.grantRuntimeAccess(AmplifyLambdaProvider.runtimeRoleToken);
  }
}

const inputSchema = z.object({
  runtime: z.string(),
  handler: z.string(),
  codePath: z.string(),
  timeoutSeconds: z
    .string()
    .transform((str) => Number.parseInt(str))
    .optional(),
  memoryMB: z
    .string()
    .transform((str) => Number.parseInt(str))
    .optional(),
});

export type FunctionConfig = z.infer<typeof inputSchema>;
