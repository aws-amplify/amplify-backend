import { Construct } from 'constructs';
import {
  AmplifyCdkType,
  aCDK,
  AmplifyServiceProvider,
  AmplifyServiceProviderFactory,
  AmplifyInitializer,
  LambdaEventHandler,
  RuntimeAccessAttacher,
  RuntimeResourceInfo,
  SecretHandler,
  AmplifySecret,
  aZod,
} from '../../types';

export const init: AmplifyInitializer = (awsCdkLib: AmplifyCdkType) => {
  return new AmplifyLambdaProviderFactory(awsCdkLib);
};

class AmplifyLambdaProviderFactory implements AmplifyServiceProviderFactory {
  constructor(private readonly awsCdkLib: AmplifyCdkType) {}

  getServiceProvider(scope: Construct, name: string): AmplifyServiceProvider {
    return new AmplifyLambdaProvider(scope, name, this.awsCdkLib);
  }

  getDefinitionSchema(): aZod.AnyZodObject {
    return aZod.object({});
  }
}

class AmplifyLambdaProvider extends AmplifyServiceProvider implements LambdaEventHandler, RuntimeAccessAttacher, SecretHandler {
  private static readonly runtimeRoleToken = 'lambdaRuntime';

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
    this.func = new this.lambda.Function(this, this.name, {
      runtime: new this.lambda.Runtime(configuration.runtime),
      handler: configuration.handler,
      timeout: typeof configuration.timeoutSeconds === 'number' ? this.cdk.Duration.seconds(configuration.timeoutSeconds) : undefined,
      code: this.lambda.Code.fromAsset(configuration.relativeBuildAssetPath),
      environment: {
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

  attachRuntimePolicy(
    runtimeRoleToken: string,
    policy: aCDK.aws_iam.PolicyStatement,
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

const inputSchema = aZod.object({
  runtime: aZod.string(),
  handler: aZod.string(),
  relativeBuildAssetPath: aZod.string(),
  timeoutSeconds: aZod
    .string()
    .transform((str) => Number.parseInt(str))
    .optional(),
  memoryMB: aZod
    .string()
    .transform((str) => Number.parseInt(str))
    .optional(),
});

type InputSchema = aZod.infer<typeof inputSchema>;
