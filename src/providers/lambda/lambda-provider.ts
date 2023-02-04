import { Construct } from 'constructs';
import {
  AmplifyCdkType,
  aCDK,
  AmplifyServiceProvider,
  AmplifyServiceProviderFactory,
  AmplifyInitializer,
  LambdaEventHandler,
  RuntimeAccessAttacher,
  ResourceNameArnTuple,
  SecretHandler,
  AmplifySecret,
  aZod,
} from '../../types';
import { SecretRef } from '../../amplify-reference';
import { z } from 'zod';

export const init: AmplifyInitializer = (awsCdkLib: AmplifyCdkType) => {
  return new AmplifyLambdaProviderFactory(awsCdkLib);
};

class AmplifyLambdaProviderFactory implements AmplifyServiceProviderFactory {
  constructor(private readonly awsCdkLib: AmplifyCdkType) {}

  getServiceProvider(scope: Construct, name: string): AmplifyServiceProvider {
    return new AmplifyLambdaProvider(scope, name, this.awsCdkLib);
  }
}

class AmplifyLambdaProvider extends AmplifyServiceProvider implements LambdaEventHandler, RuntimeAccessAttacher, SecretHandler {
  private func: aCDK.aws_lambda.Function;
  private readonly lambda: AmplifyCdkType['aws_lambda'];
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
    this.lambda = cdk.aws_lambda;
  }

  getDefinitionSchema() {
    return inputSchema;
  }

  init(configuration: InputSchema) {
    const secretRef = new SecretRef(this, 'test-secret');

    this.func = new this.lambda.Function(this, this.name, {
      runtime: new this.lambda.Runtime(configuration.runtime),
      handler: configuration.handler,
      timeout: typeof configuration.timeoutSeconds === 'number' ? this.cdk.Duration.seconds(configuration.timeoutSeconds) : undefined,
      code: this.lambda.Code.fromAsset(configuration.relativeBuildAssetPath),
      environment: {
        SOME_SECRET: secretRef.getValueRef(),
        FORCE_UPDATE: 'yes',
      },
    });
  }

  finalizeResources(): void {
    // intentional noop
  }

  getLambdaRef(): aCDK.aws_lambda.IFunction {
    return this.func;
  }

  attachRuntimePolicy(runtimeRoleToken: string, policy: aCDK.aws_iam.PolicyStatement, resource: ResourceNameArnTuple): void {
    if (runtimeRoleToken !== 'lambdaRuntime') {
      throw new Error(`Unknown runtimeRoleToken ${runtimeRoleToken} found when generating access policy`);
    }
    this.func.addToRolePolicy(policy);
    this.func.addEnvironment(resource.name, resource.arn);
  }

  acceptSecret(name: string, secret: AmplifySecret): void {
    secret.grantRuntimeAccess(this);
  }
}

const inputSchema = aZod.object({
  runtime: z.string(),
  handler: z.string(),
  relativeBuildAssetPath: z.string(),
  timeoutSeconds: z
    .string()
    .transform((str) => Number.parseInt(str))
    .optional(),
  memoryMB: z
    .string()
    .transform((str) => Number.parseInt(str))
    .optional(),
});

type InputSchema = aZod.infer<typeof inputSchema>;
