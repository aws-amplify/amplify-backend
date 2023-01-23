import { Construct } from 'constructs';
import {
  AmplifyCdkType,
  AmplifyCdkWrap,
  AmplifyServiceProvider,
  AmplifyServiceProviderFactory,
  AmplifyInitializer,
  LambdaEventHandler,
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

class AmplifyLambdaProvider extends AmplifyServiceProvider implements LambdaEventHandler {
  private func: AmplifyCdkWrap.aws_lambda.Function;
  private readonly lambda: AmplifyCdkType['aws_lambda'];
  constructor(scope: Construct, private readonly name: string, private readonly awsCdkLib: AmplifyCdkType) {
    super(scope, name);
    this.lambda = awsCdkLib.aws_lambda;
  }

  getAnnotatedConfigClass(): typeof AmplifyServerlessFunctionConfiguration {
    return AmplifyServerlessFunctionConfiguration;
  }

  init(configuration: AmplifyServerlessFunctionConfiguration) {
    const secretRef = new SecretRef(this, 'test-secret');

    this.func = new this.lambda.Function(this, this.name, {
      runtime: new this.lambda.Runtime(configuration.runtime),
      handler: configuration.handler,
      timeout: typeof configuration.timeoutSeconds === 'number' ? this.awsCdkLib.Duration.seconds(configuration.timeoutSeconds) : undefined,
      code: this.lambda.Code.fromAsset(configuration.relativeBuildAssetPath),
      environment: {
        SOME_SECRET: secretRef.getValueRef(),
        FORCE_UPDATE: 'yes',
      },
    });
  }

  finalize(): void {
    // intentional noop
  }

  getLambdaRef(): AmplifyCdkWrap.aws_lambda.IFunction {
    return this.func;
  }
}

type BuildConfig = {
  buildCommand: string;
  sourceDirectory: string;
};

class AmplifyServerlessFunctionConfiguration implements IAmplifyServerlessFunctionConfiguration {
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
