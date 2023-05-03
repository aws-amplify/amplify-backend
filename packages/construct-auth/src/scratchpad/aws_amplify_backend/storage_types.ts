import {
  AmplifyConstruct,
  AmplifyContext,
  ConstructBuilder,
  RuntimeEntity,
  WithOverride,
} from './base_types.js';
import { Bucket, EventType, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IPolicy, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BucketNotifications } from 'aws-cdk-lib/aws-s3/lib/notifications-resource/index.js';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

type FileStorageConstructProps = {
  enforceSSL?: boolean;
};

type FileStorageBuilderProps = FileStorageConstructProps &
  WithOverride<FileStorageResources>;

type FileStorageRuntimeEntityName = never;
type FileStorageEvent = 'update' | 'delete';
type FileStorageAction = 'create' | 'read' | 'update' | 'delete' | 'list';
type FileStorageScope = string;
type FileStorageResources = {
  bucket: IBucket;
};
type FileStorageIsHandler = false;
type FileStorageHasDefaultRuntimeEntity = false;

class FileStorageConstruct
  extends Construct
  implements
    AmplifyConstruct<
      FileStorageRuntimeEntityName,
      FileStorageEvent,
      FileStorageAction,
      FileStorageScope,
      FileStorageResources,
      FileStorageIsHandler,
      FileStorageHasDefaultRuntimeEntity
    >
{
  bucket: IBucket;

  constructor(
    scope: Construct,
    name: string,
    props: FileStorageConstructProps
  ) {
    super(scope, name);

    this.bucket = new Bucket(this, 'bucket', {
      enforceSSL: !!props.enforceSSL,
    });
  }

  grant(
    entity: RuntimeEntity,
    actions: FileStorageAction[],
    scope: FileStorageScope
  ): void {

    let path = '';
    switch (scope) {
      case 'private':
        path = `private/${entity.discriminant}/*`
        break;
      case 'protected':
        path = 'protected/*'
        break;
      case 'public':
        path = 'public/*'
        break;
    }
    const readActions = [
      "s3:Get*",
      "s3:List*",
      "s3-object-lambda:Get*",
      "s3-object-lambda:List*"
    ];
    const createActions = [
      ...readActions,
      's3: PutObject'
    ];
    const updateActions = [
      ...readActions,
      's3: PutObject'
    ];
    const deleteActions = [
      ...readActions,
      's3:DeleteObject',
      's3:DeleteObjectVersion'
    ];
    const listActions = [
      "s3:List*",
      "s3-object-lambda:List*"
    ];

    let allowedActions: string[] = [];
    actions.forEach(action => {
      switch (action) {
        case 'create':
          allowedActions.push(...createActions);
          break;
        case 'read':
          allowedActions.push(...readActions);
          break;
        case 'update':
          allowedActions.push(...updateActions);
          break;
        case 'delete':
          allowedActions.push(...deleteActions);
          break;
        case 'list':
          allowedActions.push(...listActions);
          break;
      }
    });
    allowedActions = [...new Set(allowedActions)];

    const newPolicy = new Policy(this, 'grant-policy', {
      statements: [
        new PolicyStatement({
          resources: [`${this.bucket.bucketArn}/${path}`],
          actions: allowedActions
        })
      ]
    });
    entity.role.attachInlinePolicy(newPolicy);
  }

  setTrigger(eventName: FileStorageEvent, handler: IFunction): void {
    switch (eventName) {
      case 'update':
        this.bucket.addEventNotification(
          EventType.OBJECT_CREATED,
          new LambdaDestination(handler)
        );
        break;
      case 'delete':
        this.bucket.addEventNotification(
          EventType.OBJECT_REMOVED,
          new LambdaDestination(handler)
        );
        break;
    }
  }

  supplyRuntimeEntity(
    runtimeEntityName: FileStorageRuntimeEntityName
  ): RuntimeEntity {
    throw new Error('No file storage runtime entity');
  }
}

export const FileStorage = FileStorageBuilder;

/**
 * Create cloud storage
 */
class FileStorageBuilder
  implements
    ConstructBuilder<
      FileStorageRuntimeEntityName,
      FileStorageEvent,
      FileStorageAction,
      FileStorageScope,
      FileStorageResources,
      FileStorageIsHandler,
      FileStorageHasDefaultRuntimeEntity
    >
{
  constructor(private readonly props: FileStorageBuilderProps) {}

  /**
   *
   */
  build(
    ctx: AmplifyContext,
    name: string
  ): AmplifyConstruct<
    FileStorageRuntimeEntityName,
    FileStorageEvent,
    FileStorageAction,
    FileStorageScope,
    FileStorageResources,
    FileStorageIsHandler,
    FileStorageHasDefaultRuntimeEntity
  > {
    return new FileStorageConstruct(ctx.getScope(), name, this.props);
  }
}
