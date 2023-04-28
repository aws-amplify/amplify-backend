import { AmplifyConstruct, FeatureBuilder } from './base_types.js';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IPolicy, Policy } from 'aws-cdk-lib/aws-iam';

type FileStorageProps = {
  enforceSSL?: boolean;
};

type FileStorageEvent = 'update' | 'delete';
type FileStorageRole = undefined;
type FileStorageAction = 'create' | 'read' | 'update' | 'delete' | 'list';
type FileStorageScope = string;
type FileStorageResources = {
  bucket: IBucket;
};

class FileStorageConstruct
  extends Construct
  implements
    AmplifyConstruct<
      FileStorageEvent,
      FileStorageRole,
      FileStorageAction,
      FileStorageScope,
      FileStorageResources
    >
{
  resources: FileStorageResources;

  constructor(scope: Construct, name: string, props: FileStorageProps) {
    super(scope, name);

    this.resources.bucket = new Bucket(this, 'bucket', props);
  }

  onCloudEvent(event: FileStorageEvent, handler: IFunction) {
    return this;
  }

  actions(actions: FileStorageAction[], scopes?: FileStorageScope[]) {
    return new Policy(this, 'policy');
  }

  grant(role: FileStorageRole, policy: IPolicy): this {
    return this;
  }
}

/**
 * Create cloud storage
 */
export const FileStorage: FeatureBuilder<
  FileStorageProps,
  FileStorageEvent,
  FileStorageRole,
  FileStorageAction,
  FileStorageScope,
  FileStorageResources
> = (props: FileStorageProps) => (ctx, name) => {
  return new FileStorageConstruct(ctx.getScope(), name, props);
};
