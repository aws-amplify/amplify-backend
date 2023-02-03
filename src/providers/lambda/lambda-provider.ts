import { Construct } from 'constructs';
import {
  AmplifyCdkType,
  AmplifyCdkWrap,
  AmplifyServiceProvider,
  AmplifyServiceProviderFactory,
  AmplifyInitializer,
  LambdaEventHandler,
  RuntimeAccessAttacher,
  ResourceNameArnTuple,
  SecretHandler,
  AmplifySecret,
} from '../../types';
import { Type } from 'class-transformer';
import { Max } from 'class-validator';
import { SecretRef } from '../../amplify-reference';

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
  private func: AmplifyCdkWrap.aws_lambda.Function;
  private readonly lambda: AmplifyCdkType['aws_lambda'];
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
    this.lambda = cdk.aws_lambda;
  }

  getAnnotatedConfigClass(): typeof AmplifyLambdaConfiguration {
    return AmplifyLambdaConfiguration;
  }

  init(configuration: AmplifyLambdaConfiguration) {
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

  getLambdaRef(): AmplifyCdkWrap.aws_lambda.IFunction {
    return this.func;
  }

  attachRuntimePolicy(runtimeRoleToken: string, policy: AmplifyCdkWrap.aws_iam.PolicyStatement, resource: ResourceNameArnTuple): void {
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

type BuildConfig = {
  buildCommand: string;
  sourceDirectory: string;
};

class AmplifyLambdaConfiguration implements IAmplifyServerlessFunctionConfiguration {
  runtime: string;
  handler: string;
  relativeBuildAssetPath: string;

  @Type(() => Number)
  @Max(100)
  timeoutSeconds?: number;

  @Type(() => Number)
  memoryMB?: number;
  buildConfig?: BuildConfig;
}

type IAmplifyServerlessFunctionConfiguration = {
  runtime: string;
  handler: string;
  relativeBuildAssetPath: string;
  timeoutSeconds?: number;
  memoryMB?: number;
  buildConfig?: BuildConfig;
};
