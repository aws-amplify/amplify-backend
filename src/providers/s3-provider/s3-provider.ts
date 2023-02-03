import { Construct } from 'constructs';
import {
  AmplifyServiceProvider,
  AmplifyServiceProviderFactory,
  AmplifyCdkWrap,
  AmplifyCdkType,
  LambdaEventSource,
  AmplifyInitializer,
} from '../../types';

export const init: AmplifyInitializer = (cdk: AmplifyCdkType) => {
  return new AmplifyS3ProviderFactory(cdk);
};

class AmplifyS3ProviderFactory implements AmplifyServiceProviderFactory {
  constructor(private readonly cdk: AmplifyCdkType) {}

  getServiceProvider(scope: Construct, name: string): AmplifyServiceProvider {
    return new AmplifyS3Provider(scope, name, this.cdk);
  }
}

class AmplifyS3Provider extends AmplifyServiceProvider implements LambdaEventSource {
  private bucket: AmplifyCdkWrap.aws_s3.Bucket;
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
  }

  getAnnotatedConfigClass(): typeof AmplifyStorageConfiguration {
    return AmplifyStorageConfiguration;
  }

  init(configuration: AmplifyStorageConfiguration) {
    this.cdk.aws_s3.BucketEncryption.KMS_MANAGED;
    this.bucket = new this.cdk.aws_s3.Bucket(this, this.name, {
      enforceSSL: configuration.enforceSSL,
    });
  }

  finalizeResources(): void {
    this.cdk.Stack.of(this).addMetadata('bucketArn', this.bucket.bucketArn);
    // intentional noop
  }

  attachLambdaEventHandler(eventSourceName: string, handler: AmplifyCdkWrap.aws_lambda.IFunction): void {
    if (eventSourceName !== 'stream') {
      throw new Error(`Unknown event source name ${eventSourceName}`);
    }

    handler.addEventSource(new this.cdk.aws_lambda_event_sources.S3EventSource(this.bucket, { events: [this.cdk.aws_s3.EventType.OBJECT_CREATED] }));
  }
}

type IAmplifyStorageConfiguration = {
  enforceSSL: boolean;
};

class AmplifyStorageConfiguration implements IAmplifyStorageConfiguration {
  enforceSSL: boolean;
}
