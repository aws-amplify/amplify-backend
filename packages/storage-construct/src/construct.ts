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
import {
  StorageAccessPolicyFactory,
  StoragePath,
} from './storage_access_policy_factory.js';
import {
  StorageAccessDefinition,
  StorageAccessOrchestrator,
} from './storage_access_orchestrator.js';
import { AuthRoleResolver } from './auth_role_resolver.js';

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Storage in BI metrics
const storageStackType = 'storage-S3';

export type AmplifyStorageTriggerEvent = 'onDelete' | 'onUpload';

export type AmplifyStorageProps = {
  /**
   * Whether this storage resource is the default storage resource for the backend.
   * required and relevant only if there are multiple storage resources defined.
   * @default false
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
   * ```typescript
   * import \{ myFunction \} from '../functions/my-function/resource.ts'
   *
   * export const storage = new AmplifyStorage(stack, 'MyStorage', \{
   *   name: 'myStorage',
   *   triggers: \{
   *     onUpload: myFunction
   *   \}
   * \})
   * ```
   */
  triggers?: Partial<Record<AmplifyStorageTriggerEvent, IFunction>>;
};

export type StorageAccessRule = {
  type: 'authenticated' | 'guest' | 'owner' | 'groups';
  actions: Array<'read' | 'write' | 'delete'>;
  groups?: string[];
};

export type StorageAccessConfig = {
  [path: string]: StorageAccessRule[];
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
   * @param auth - The AmplifyAuth construct to grant access to
   * @param access - Access definition specifying paths and permissions
   * @example
   * ```typescript
   * const auth = new AmplifyAuth(stack, 'Auth', \{...\});
   * const storage = new AmplifyStorage(stack, 'Storage', \{...\});
   * storage.grantAccess(auth, \{
   *   'photos/*': [
   *     \{ type: 'authenticated', actions: ['read', 'write'] \},
   *     \{ type: 'guest', actions: ['read'] \}
   *   ]
   * \});
   * ```
   */
  grantAccess = (auth: unknown, access: StorageAccessConfig): void => {
    const policyFactory = new StorageAccessPolicyFactory(this.resources.bucket);
    const orchestrator = new StorageAccessOrchestrator(policyFactory);
    const roleResolver = new AuthRoleResolver();

    // Validate auth construct
    if (!roleResolver.validateAuthConstruct(auth)) {
      throw new Error('Invalid auth construct provided to grantAccess');
    }

    // Resolve roles from auth construct
    const authRoles = roleResolver.resolveRoles();

    // Convert access config to orchestrator format
    const accessDefinitions: Record<StoragePath, StorageAccessDefinition[]> =
      {};

    Object.entries(access).forEach(([path, rules]) => {
      const storagePath = path as StoragePath;
      accessDefinitions[storagePath] = [];

      rules.forEach((rule) => {
        const role = roleResolver.getRoleForAccessType(
          rule.type,
          authRoles,
          rule.groups,
        );

        if (role) {
          // Determine ID substitution based on access type
          let idSubstitution = '*';
          if (rule.type === 'owner') {
            idSubstitution = '${cognito-identity.amazonaws.com:sub}';
          }

          accessDefinitions[storagePath].push({
            role,
            actions: rule.actions,
            idSubstitution,
          });
        } else {
          // Role not found for access type
        }
      });
    });

    // Orchestrate access control
    orchestrator.orchestrateStorageAccess(accessDefinitions);
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
