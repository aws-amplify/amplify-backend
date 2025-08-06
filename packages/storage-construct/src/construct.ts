import { Construct } from 'constructs';
import {
  Bucket,
  BucketProps,
  CfnBucket,
  EventType,
  HttpMethods,
  IBucket,
} from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'node:url';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { S3EventSourceV2 } from 'aws-cdk-lib/aws-lambda-event-sources';

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
  /**
   * S3 event trigger configuration
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#configure-storage-triggers
   * @example
   * import { myFunction } from '../functions/my-function/resource.ts'
   *
   * export const storage = new AmplifyStorage(stack, 'MyStorage', {
   *   name: 'myStorage',
   *   triggers: {
   *     onUpload: myFunction
   *   }
   * })
   */
  triggers?: Partial<Record<AmplifyStorageTriggerEvent, IFunction>>;
};

export type StorageAccessDefinition = {
  [path: string]: Array<{
    type: 'authenticated' | 'guest' | 'owner' | 'groups';
    actions: Array<'read' | 'write' | 'delete'>;
    groups?: string[];
  }>;
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
 * A standalone L3 construct for creating S3-based storage with optional triggers
 */
export class AmplifyStorage extends Construct {
  readonly stack: Stack;
  readonly resources: StorageResources;
  readonly isDefault: boolean;
  readonly name: string;

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

    // Set up triggers if provided
    if (props.triggers) {
      this.setupTriggers(props.triggers);
    }

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
   * Grant access to this storage bucket based on auth construct and access definition
   * @param _auth - The AmplifyAuth construct to grant access to
   * @param _access - Access definition specifying paths and permissions
   * @example
   * const auth = new AmplifyAuth(stack, 'Auth', {...});
   * const storage = new AmplifyStorage(stack, 'Storage', {...});
   * storage.grantAccess(auth, {
   *   'photos/*': [
   *     { type: 'authenticated', actions: ['read', 'write'] },
   *     { type: 'guest', actions: ['read'] }
   *   ]
   * });
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  grantAccess = (_auth: unknown, _access: StorageAccessDefinition): void => {
    // TODO: Implement access control logic
    // This will be implemented in future phases to:
    // 1. Extract roles from the auth construct
    // 2. Generate IAM policies based on access definition
    // 3. Attach policies to appropriate roles
  };

  /**
   * Set up triggers from props
   */
  private setupTriggers = (
    triggers: Partial<Record<AmplifyStorageTriggerEvent, IFunction>>,
  ): void => {
    Object.entries(triggers).forEach(([triggerEvent, handler]) => {
      if (!handler) return;

      const events: EventType[] = [];
      switch (triggerEvent as AmplifyStorageTriggerEvent) {
        case 'onDelete':
          events.push(EventType.OBJECT_REMOVED);
          break;
        case 'onUpload':
          events.push(EventType.OBJECT_CREATED);
          break;
      }
      this.addTrigger(events, handler);
    });
  };
}
