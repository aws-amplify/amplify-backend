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
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructFactory,
  FunctionResources,
  ResourceProvider,
  StorageOutputPayloadToStore,
} from '@aws-amplify/plugin-types';
import { storageOutputKey } from '@aws-amplify/backend-output-schemas';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'node:url';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { S3EventSourceV2 } from 'aws-cdk-lib/aws-lambda-event-sources';
import { AmplifyStorageFactory } from './factory.js';

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Storage in BI metrics
const storageStackType = 'storage-S3';

export type AmplifyStorageTriggerEvent = 'onDelete' | 'onUpload';

export type AmplifyStorageProps = {
  /**
   * Whether this storage resource is the default storage resource for the backend.
   * required if there's multiple bucket.
   * @default false (if there's multiple bucket) or @default true (if there's only one)
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
  outputStorageStrategy?: BackendOutputStorageStrategy<
    BackendOutputEntry<StorageOutputPayloadToStore>
  >;
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
  implements ResourceProvider<StorageResources>
{
  readonly resources: StorageResources;
  /**
   * Create a new AmplifyStorage instance
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps) {
    super(scope, id);

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

    this.storeOutput(props.outputStorageStrategy, props.isDefault, props.name);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      storageStackType,
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
  }

  /**
   * Attach a Lambda function trigger handler to the S3 events
   * @param events - list of S3 events that will trigger the handler
   * @param handler - The function that will handle the event
   */
  addTrigger = (events: EventType[], handler: IFunction): void => {
    handler.addEventSource(
      new S3EventSourceV2(this.resources.bucket, { events })
    );
  };

  /**
   * Store storage outputs using provided strategy
   */
  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<
      BackendOutputEntry<StorageOutputPayloadToStore>
    > = new StackMetadataBackendOutputStorageStrategy(Stack.of(this)),
    isDefault: boolean = false,
    name: string = ''
  ): void => {
    /*
     * The default bucket takes the `storageRegion` and `bucketName` name without a number post-fix.
     */
    const postfix = isDefault
      ? ''
      : AmplifyStorageFactory.factoryCounter.toString();
    outputStorageStrategy.appendToBackendOutputList(storageOutputKey, {
      version: '1',
      payload: {
        [`name${postfix}`]: name,
        [`storageRegion${postfix}`]: Stack.of(this).region,
        [`bucketName${postfix}`]: this.resources.bucket.bucketName,
      },
    });
  };
}
