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
import { entityIdSubstitution } from './constants.js';

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Storage in BI metrics
const storageStackType = 'storage-S3';

/**
 * Defines the types of trigger events that can be configured for S3 bucket notifications.
 * These events allow Lambda functions to be invoked when specific S3 operations occur.
 *
 * - 'onUpload': Triggered when objects are created in the bucket (s3:ObjectCreated:*)
 * - 'onDelete': Triggered when objects are removed from the bucket (s3:ObjectRemoved:*)
 * @example
 * ```typescript
 * const triggers = {
 *   onUpload: myUploadHandler,  // Triggered on s3:ObjectCreated:*
 *   onDelete: myDeleteHandler   // Triggered on s3:ObjectRemoved:*
 * };
 * ```
 */
export type AmplifyStorageTriggerEvent = 'onDelete' | 'onUpload';

/**
 * Configuration properties for creating an AmplifyStorage construct.
 * These properties define the basic characteristics of the S3 bucket and its features.
 */
export type AmplifyStorageProps = {
  /**
   * Whether this storage resource is the default storage resource for the backend.
   * This is required and relevant only if there are multiple storage resources defined.
   * The default storage resource is used when no specific storage is referenced.
   * @default false
   * @example
   * ```typescript
   * // Mark this as the default storage
   * const storage = new AmplifyStorage(stack, 'Storage', {
   *   name: 'main-storage',
   *   isDefault: true
   * });
   * ```
   */
  isDefault?: boolean;

  /**
   * Friendly name that will be used to derive the S3 Bucket name.
   * This name must be globally unique across all AWS accounts.
   * The actual bucket name may have additional suffixes added for uniqueness.
   * @example
   * ```typescript
   * const storage = new AmplifyStorage(stack, 'Storage', {
   *   name: 'my-app-files' // Results in bucket like 'my-app-files-example123'
   * });
   * ```
   */
  name: string;

  /**
   * Whether to enable S3 object versioning on the bucket.
   * When enabled, S3 keeps multiple versions of an object in the same bucket.
   * This provides protection against accidental deletion or modification.
   * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
   * @default false
   * @example
   * ```typescript
   * const storage = new AmplifyStorage(stack, 'Storage', {
   *   name: 'versioned-storage',
   *   versioned: true // Enable versioning for data protection
   * });
   * ```
   */
  versioned?: boolean;

  /**
   * S3 event trigger configuration that maps trigger events to Lambda functions.
   * When configured, the specified Lambda functions will be invoked automatically
   * when the corresponding S3 events occur.
   * @see https://docs.amplify.aws/gen2/build-a-backend/storage/#configure-storage-triggers
   * @example
   * ```typescript
   * import { myFunction } from '../functions/my-function/resource.ts'
   *
   * export const storage = new AmplifyStorage(stack, 'MyStorage', {
   *   name: 'myStorage',
   *   triggers: {
   *     onUpload: myFunction,  // Process files when uploaded
   *     onDelete: cleanupFunction // Cleanup when files are deleted
   *   }
   * })
   * ```
   */
  triggers?: Partial<Record<AmplifyStorageTriggerEvent, IFunction>>;
};

/**
 * Defines a single access rule that specifies who can perform what actions on storage paths.
 * This is the core building block for defining storage permissions.
 */
export type StorageAccessRule = {
  /**
   * The type of principal that gets access:
   * - 'authenticated': Any signed-in user with valid Cognito credentials
   * - 'guest': Unauthenticated users (anonymous access)
   * - 'owner': The user who owns the resource (uses entity_id substitution)
   * - 'groups': Specific user groups from Cognito User Pool
   */
  type: 'authenticated' | 'guest' | 'owner' | 'groups';

  /**
   * Array of actions the principal can perform:
   * - 'read': Allows s3:GetObject and s3:ListBucket operations
   * - 'write': Allows s3:PutObject operations
   * - 'delete': Allows s3:DeleteObject operations
   */
  actions: Array<'read' | 'write' | 'delete'>;

  /**
   * Required when type is 'groups'. Specifies which Cognito User Pool groups get access.
   * Must match group names defined in your auth configuration.
   * @example
   * ```typescript
   * { type: 'groups', actions: ['read', 'write'], groups: ['admin', 'moderator'] }
   * ```
   */
  groups?: string[];
};

/**
 * Maps storage paths to arrays of access rules. This defines the complete access control
 * configuration for the storage bucket.
 *
 * Keys must be valid S3 path patterns ending with '/*'.
 * Special token '{entity_id}' can be used for owner-based access patterns.
 * @example
 * ```typescript
 * const accessConfig: StorageAccessConfig = {
 *   // Public files readable by everyone
 *   'public/*': [
 *     { type: 'authenticated', actions: ['read'] },
 *     { type: 'guest', actions: ['read'] }
 *   ],
 *
 *   // Private files only accessible by the owner
 *   'private/{entity_id}/*': [
 *     { type: 'owner', actions: ['read', 'write', 'delete'] }
 *   ],
 *
 *   // Admin-only files
 *   'admin/*': [
 *     { type: 'groups', actions: ['read', 'write', 'delete'], groups: ['admin'] }
 *   ]
 * };
 * ```
 */
export type StorageAccessConfig = {
  [path: string]: StorageAccessRule[];
};

/**
 * Represents all the AWS resources created by the AmplifyStorage construct.
 * This provides access to the underlying CDK constructs for advanced customization.
 */
export type StorageResources = {
  /** The S3 bucket construct that stores the files */
  bucket: IBucket;
  /** CloudFormation-level resource access for low-level customization */
  cfnResources: {
    /** The CloudFormation S3 bucket resource */
    cfnBucket: CfnBucket;
  };
};

/**
 * AmplifyStorage is a high-level CDK construct that creates an S3 bucket with built-in
 * access control, CORS configuration, and optional Lambda triggers.
 *
 * This construct simplifies the creation of storage resources for Amplify applications by providing:
 * - Pre-configured S3 bucket with sensible defaults for web applications
 * - Integrated IAM policy management through grantAccess() method
 * - Support for different access patterns (public, private, group-based, owner-based)
 * - Optional Lambda triggers for S3 events (upload, delete)
 * - Automatic cleanup policies and CORS configuration
 * - SSL enforcement and security best practices
 * @example
 * ```typescript
 * // Basic usage
 * const storage = new AmplifyStorage(stack, 'AppStorage', {
 *   name: 'my-app-files'
 * });
 *
 * // Grant access to different user types
 * storage.grantAccess(auth, {
 *   'public/*': [
 *     { type: 'authenticated', actions: ['read'] },
 *     { type: 'guest', actions: ['read'] }
 *   ],
 *   'private/{entity_id}/*': [
 *     { type: 'owner', actions: ['read', 'write', 'delete'] }
 *   ]
 * });
 * ```
 */
export class AmplifyStorage extends Construct {
  /** Reference to the CDK Stack containing this construct */
  readonly stack: Stack;

  /** Provides access to all AWS resources created by this construct */
  readonly resources: StorageResources;

  /** Whether this is the default storage resource for the backend */
  readonly isDefault: boolean;

  /** The friendly name of this storage resource */
  readonly name: string;

  /**
   * Creates a new AmplifyStorage construct with an S3 bucket and associated resources.
   *
   * The constructor performs several key operations:
   * 1. Creates an S3 bucket with Amplify-optimized configuration
   * 2. Sets up CORS policies for web application access
   * 3. Configures SSL enforcement and security policies
   * 4. Sets up Lambda triggers if specified
   * 5. Stores attribution metadata for Amplify tooling
   * @param scope - The parent construct (usually a Stack)
   * @param id - Unique identifier for this construct within the scope
   * @param props - Configuration properties for the storage bucket
   * @example
   * ```typescript
   * const storage = new AmplifyStorage(stack, 'MyStorage', {
   *   name: 'my-unique-bucket-name',
   *   versioned: true,
   *   triggers: {
   *     onUpload: processUploadFunction
   *   }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps) {
    super(scope, id);

    // Store configuration properties
    this.isDefault = props.isDefault || false;
    this.name = props.name;
    this.stack = Stack.of(scope);

    // Configure S3 bucket properties with Amplify-optimized defaults
    const bucketProps: BucketProps = {
      // Enable versioning if requested
      versioned: props.versioned || false,

      // Configure CORS to allow web applications to access the bucket
      // This is essential for browser-based file uploads and downloads
      cors: [
        {
          maxAge: 3000, // Cache preflight requests for 50 minutes
          // Expose headers that clients might need for file operations
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag',
          ],
          allowedHeaders: ['*'], // Allow any headers in requests
          allowedOrigins: ['*'], // Allow requests from any origin
          // Allow all necessary HTTP methods for file operations
          allowedMethods: [
            HttpMethods.GET, // Download files
            HttpMethods.HEAD, // Check file metadata
            HttpMethods.PUT, // Upload files
            HttpMethods.POST, // Multi-part uploads
            HttpMethods.DELETE, // Delete files
          ],
        },
      ],

      // Configure automatic cleanup when the stack is destroyed
      autoDeleteObjects: true, // Delete all objects before deleting bucket
      removalPolicy: RemovalPolicy.DESTROY, // Allow CDK to delete the bucket

      // Enforce SSL/TLS for all requests (security best practice)
      enforceSSL: true,
    };

    // Create the main S3 bucket with the configured properties
    const bucket = new Bucket(this, 'Bucket', bucketProps);

    // Initialize the resources object for external access
    this.resources = {
      bucket,
      cfnResources: {
        // Provide access to the underlying CloudFormation resource
        cfnBucket: bucket.node.findChild('Resource') as CfnBucket,
      },
    };

    // Set up Lambda triggers if any were provided
    if (props.triggers) {
      this.setupTriggers(props.triggers);
    }

    // Store metadata about this storage resource for Amplify tooling
    // This helps the Amplify CLI and console understand and manage the resource
    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      storageStackType, // Resource type identifier for metrics
      fileURLToPath(new URL('../package.json', import.meta.url)), // Package info
    );
  }

  /**
   * Attach a Lambda function trigger handler to specific S3 events.
   * This method creates the necessary event source mapping between S3 and Lambda.
   * @param events - Array of S3 events that will trigger the handler
   * @param handler - The Lambda function that will handle the events
   * @example
   * ```typescript
   * // Trigger function on object creation
   * storage.addTrigger([EventType.OBJECT_CREATED], myProcessingFunction);
   *
   * // Trigger function on object deletion
   * storage.addTrigger([EventType.OBJECT_REMOVED], myCleanupFunction);
   * ```
   */
  addTrigger = (events: EventType[], handler: IFunction): void => {
    // Create an S3 event source that will invoke the Lambda function
    // when the specified events occur on this bucket
    handler.addEventSource(
      new S3EventSourceV2(this.resources.bucket, { events }),
    );
  };

  /**
   * Grants access to the storage bucket based on the provided access configuration.
   * This is the primary method for setting up permissions on the storage bucket.
   *
   * The method performs several key operations:
   * 1. Validates the auth construct to ensure it provides necessary IAM roles
   * 2. Resolves IAM roles from the auth construct (authenticated, unauthenticated, groups)
   * 3. Converts high-level access rules to low-level IAM policy statements
   * 4. Creates IAM policies with appropriate S3 permissions
   * 5. Attaches policies to the correct roles
   * 6. Handles path-based access control and entity ID substitution
   * 7. Applies deny-by-default logic for hierarchical path access
   * @param auth - The auth construct that provides IAM roles (e.g., AmplifyAuth)
   * @param access - Configuration mapping storage paths to access rules
   * @throws {Error} When auth construct is null, undefined, or doesn't provide required roles
   * @example
   * ```typescript
   * // Basic access configuration
   * storage.grantAccess(auth, {
   *   // Public files accessible to all users
   *   'public/*': [
   *     { type: 'authenticated', actions: ['read', 'write'] },
   *     { type: 'guest', actions: ['read'] }
   *   ],
   *
   *   // Private files only accessible by the owner
   *   'private/{entity_id}/*': [
   *     { type: 'owner', actions: ['read', 'write', 'delete'] }
   *   ],
   *
   *   // Admin files only accessible by admin group
   *   'admin/*': [
   *     { type: 'groups', actions: ['read', 'write', 'delete'], groups: ['admin'] }
   *   ]
   * });
   * ```
   */
  grantAccess = (auth: unknown, access: StorageAccessConfig): void => {
    // Create the policy factory that converts storage actions to S3 IAM permissions
    const policyFactory = new StorageAccessPolicyFactory(this.resources.bucket);

    // Create the orchestrator that coordinates policy creation and attachment
    const orchestrator = new StorageAccessOrchestrator(policyFactory);

    // Create a role resolver to extract IAM roles from the auth construct
    const roleResolver = new AuthRoleResolver();

    // Validate that the auth construct is valid and provides necessary roles
    if (!roleResolver.validateAuthConstruct(auth)) {
      throw new Error('Invalid auth construct provided to grantAccess');
    }

    // Extract IAM roles from the auth construct
    // This includes authenticated role, unauthenticated role, and user group roles
    const authRoles = roleResolver.resolveRoles();

    // Convert the high-level access configuration to low-level access definitions
    // that the orchestrator can process
    const accessDefinitions: Record<StoragePath, StorageAccessDefinition[]> =
      {};

    // Process each storage path and its associated access rules
    Object.entries(access).forEach(([path, rules]) => {
      const storagePath = path as StoragePath;
      accessDefinitions[storagePath] = [];

      // Convert each access rule to an access definition with resolved IAM role
      rules.forEach((rule) => {
        // Resolve the appropriate IAM role for this access type
        const role = roleResolver.getRoleForAccessType(
          rule.type,
          authRoles,
          rule.groups,
        );

        if (role) {
          // Determine ID substitution pattern based on access type
          let idSubstitution = '*'; // Default wildcard for non-owner access
          if (rule.type === 'owner') {
            // For owner access, substitute with the user's Cognito identity ID
            idSubstitution = entityIdSubstitution;
          }

          // Add the access definition to be processed by the orchestrator
          accessDefinitions[storagePath].push({
            role, // The IAM role that will receive the policy
            actions: rule.actions, // The storage actions to allow
            idSubstitution, // Pattern for path substitution
          });
        } else {
          // Role not found for access type - this could happen if:
          // - Auth construct doesn't have the required role
          // - Group doesn't exist in the auth configuration
          // The orchestrator will handle this gracefully by skipping the rule
        }
      });
    });

    // Execute the orchestration process:
    // 1. Validate all storage paths for correctness
    // 2. Convert storage actions to specific S3 permissions
    // 3. Apply path-based access control logic
    // 4. Handle entity ID substitution for owner access
    // 5. Create IAM policy documents with proper statements
    // 6. Attach policies to the appropriate IAM roles
    orchestrator.orchestrateStorageAccess(accessDefinitions);
  };

  /**
   * Private method to set up Lambda triggers from the props configuration.
   * This method maps trigger event types to S3 event types and creates the necessary
   * event source mappings.
   * @param triggers - Map of trigger events to Lambda functions
   * @private
   */
  private setupTriggers = (
    triggers: Partial<Record<AmplifyStorageTriggerEvent, IFunction>>,
  ): void => {
    // Process each trigger configuration
    Object.entries(triggers).forEach(([triggerEvent, handler]) => {
      if (!handler) return; // Skip if no handler provided

      // Map trigger event types to S3 event types
      const events: EventType[] = [];
      switch (triggerEvent as AmplifyStorageTriggerEvent) {
        case 'onDelete':
          // Trigger when objects are removed from the bucket
          events.push(EventType.OBJECT_REMOVED);
          break;
        case 'onUpload':
          // Trigger when objects are created in the bucket
          events.push(EventType.OBJECT_CREATED);
          break;
      }

      // Create the event source mapping
      this.addTrigger(events, handler);
    });
  };
}
