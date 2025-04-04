import { Construct } from 'constructs';
import {
  Bucket,
  BucketProps,
  CfnBucket,
  EventType,
  HttpMethods,
  IBucket,
} from 'aws-cdk-lib/aws-s3';
import {
  BackendOutputStorageStrategy,
  ConstructFactory,
  FunctionResources,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { StorageOutput } from '@aws-amplify/backend-output-schemas';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'node:url';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { S3EventSourceV2 } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StorageAccessDefinitionOutput } from './private_types.js';

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Storage in BI metrics
const storageStackType = 'storage-S3';

export type AmplifyStorageTriggerEvent = 'onDelete' | 'onUpload';

export type AmplifyStorageProps = {
  /**
   * Whether this storage resource is the default storage resource for the backend.
   * required and relevant only if there are multiple storage resources defined.
   * @default false.
   */
  isDefault?: boolean;
  /**
   * Friendly name that will be used to derive the S3 Bucket name
   */
  name: string;
  /**
   * Whether to enable S3 object versioning on the bucket.
   * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
   * @default false
   */
  versioned?: boolean;
  outputStorageStrategy?: BackendOutputStorageStrategy<StorageOutput>;
  /**
   * S3 event trigger configuration
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#configure-storage-triggers
   * @example
   * import { triggerHandler } from '../functions/trigger-handler/resource.ts'
   *
   * export const storage = defineStorage({
   *   triggers: {
   *     onUpload: triggerHandler
   *   }
   * })
   */
  triggers?: Partial<
    Record<
      AmplifyStorageTriggerEvent,
      ConstructFactory<ResourceProvider<FunctionResources>>
    >
  >;
};

export type StorageResources = {
  bucket: IBucket;
  cfnResources: {
    cfnBucket: CfnBucket;
  };
};

/**
 * Amplify Storage CDK Construct
 *
 * Currently just a thin wrapper around an S3 bucket
 */
export class AmplifyStorage
  extends Construct
  implements ResourceProvider<StorageResources>, StackProvider
{
  readonly stack: Stack;
  readonly resources: StorageResources;
  readonly isDefault: boolean;
  readonly name: string;
  accessDefinition: StorageAccessDefinitionOutput;
  /**
   * Create a new AmplifyStorage instance
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps) {
    super(scope, id);
    this.isDefault = props.isDefault || false;
    this.name = props.name;
    this.stack = Stack.of(scope);

    const bucketProps: BucketProps = {
      versioned: props.versioned || false,
      cors: [
        {
          maxAge: 3000,
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag',
          ],
          allowedHeaders: ['*'],
          allowedOrigins: ['*'],
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.HEAD,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE,
          ],
        },
      ],
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      enforceSSL: true,
    };

    const bucket = new Bucket(this, 'Bucket', bucketProps);

    this.resources = {
      bucket,
      cfnResources: {
        cfnBucket: bucket.node.findChild('Resource') as CfnBucket,
      },
    };

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      storageStackType,
      fileURLToPath(new URL('../package.json', import.meta.url)),
    );
  }

  /**
   * Attach a Lambda function trigger handler to the S3 events
   * @param events - list of S3 events that will trigger the handler
   * @param handler - The function that will handle the event
   */
  addTrigger = (events: EventType[], handler: IFunction): void => {
    handler.addEventSource(
      new S3EventSourceV2(this.resources.bucket, { events }),
    );
  };

  /**
   * Add access definitions to storage
   */
  addAccessDefinition = (accessOutput: StorageAccessDefinitionOutput) => {
    this.accessDefinition = accessOutput;
  };
}
