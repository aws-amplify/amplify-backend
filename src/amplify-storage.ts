import { Construct } from "constructs";
import {
  AmplifyConstruct,
  ResourceNameArnTuple,
  AmplifyResourceTransform,
  AmplifyCdkWrap,
  AmplifyCdkType,
  LambdaEventSource,
  AmplifyResourceTransformFactory,
} from "./types";

export const getAmplifyResourceTransform: AmplifyResourceTransformFactory = (
  awsCdkLib: AmplifyCdkType
) => {
  return new AmplifyFileStorageTransform(awsCdkLib);
};

class AmplifyFileStorageTransform implements AmplifyResourceTransform {
  constructor(private readonly awsCdkLib: AmplifyCdkType) {}

  getConstruct(scope: Construct, name: string): AmplifyConstruct {
    return new AmplifyFileStorageConstruct(scope, name, this.awsCdkLib);
  }
}

class AmplifyFileStorageConstruct
  extends AmplifyConstruct
  implements LambdaEventSource
{
  private bucket: AmplifyCdkWrap.aws_s3.Bucket;
  constructor(
    scope: Construct,
    private readonly name: string,
    private readonly awsCdkLib: AmplifyCdkType
  ) {
    super(scope, name);
  }

  getConfigurationSchema(): object {
    return {};
  }

  getAnnotatedConfigClass(): typeof AmplifyStorageConfiguration {
    return AmplifyStorageConfiguration;
  }

  init(configuration: AmplifyStorageConfiguration) {
    this.awsCdkLib.aws_s3.BucketEncryption.KMS_MANAGED;
    this.bucket = new this.awsCdkLib.aws_s3.Bucket(this, this.name, {
      enforceSSL: configuration.enforceSSL,
    });
  }

  finalize(): void {
    // intentional noop
  }

  attachLambdaEventHandler(
    eventSourceName: string,
    handler: AmplifyCdkWrap.aws_lambda.IFunction
  ): void {
    if (eventSourceName !== "stream") {
      throw new Error(`Unknown event source name ${eventSourceName}`);
    }
    new this.awsCdkLib.aws_lambda.CfnPermission(
      this,
      `${this.name}shadowFuncPerm`,
      {
        functionName: handler.functionName,
        action: "lambda:InvokeFunction",
        principal: "s3.amazonaws.com",
        sourceAccount: this.awsCdkLib.Stack.of(this).account,
        sourceArn: this.bucket.bucketArn,
      }
    );
    this.bucket.addEventNotification(
      this.awsCdkLib.aws_s3.EventType.OBJECT_CREATED,
      new this.awsCdkLib.aws_s3_notifications.LambdaDestination(handler)
    );
  }
}

type IAmplifyStorageConfiguration = {
  enforceSSL: boolean;
};

class AmplifyStorageConfiguration implements IAmplifyStorageConfiguration {
  enforceSSL: boolean;
}
