import { IBucket } from 'aws-cdk-lib/aws-s3';
import {
  Effect,
  Policy,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';

/**
 * High-level storage actions that users specify in access configurations.
 * These are converted to specific S3 permissions by the policy factory.
 */
export type StorageAction = 'read' | 'write' | 'delete';

/**
 * Internal storage actions used within the policy creation process.
 * These map directly to specific S3 API permissions.
 */
export type InternalStorageAction = 'get' | 'list' | 'write' | 'delete';

/**
 * Represents a storage path pattern used for S3 object access control.
 * Must end with '/*' and can contain '{entity_id}' tokens for owner-based access.
 */
export type StoragePath = `${string}/*`;

/**
 * The StorageAccessPolicyFactory creates IAM policy documents from access maps.
 * It handles the conversion of high-level storage actions to specific S3 permissions
 * and manages both allow and deny statements for fine-grained access control.
 *
 * Key responsibilities:
 * - Convert storage actions to S3 API permissions
 * - Handle list operations with proper prefix conditions
 * - Create both allow and deny policy statements
 * - Optimize policy structure for AWS limits
 * @example
 * ```typescript
 * const factory = new StorageAccessPolicyFactory(bucket);
 * const accessMap = new Map([
 *   ['get', { allow: new Set(['public/*']), deny: new Set() }],
 *   ['write', { allow: new Set(['public/*']), deny: new Set(['public/readonly/*']) }]
 * ]);
 * const policy = factory.createPolicy(accessMap);
 * ```
 */
export class StorageAccessPolicyFactory {
  /**
   * Creates a new policy factory for the specified S3 bucket.
   * @param bucket - The S3 bucket that policies will grant access to
   */
  constructor(private readonly bucket: IBucket) {}

  /**
   * Creates an IAM policy from an access map containing allow/deny rules.
   *
   * The method processes each action in the access map and creates appropriate
   * policy statements with S3 permissions. It handles special cases like:
   * - List operations requiring bucket-level permissions with prefix conditions
   * - Multiple resources for the same action
   * - Deny statements for hierarchical access control
   * @param accessMap - Map of actions to allow/deny path sets
   * @returns IAM Policy ready to be attached to roles
   * @throws {Error} When accessMap is empty or invalid
   */
  createPolicy = (
    accessMap: Map<
      InternalStorageAction,
      { allow: Set<StoragePath>; deny: Set<StoragePath> }
    >,
  ): Policy => {
    if (accessMap.size === 0) {
      throw new Error('Cannot create policy with empty access map');
    }

    const statements: PolicyStatement[] = [];

    // Process each action and create policy statements
    accessMap.forEach(({ allow, deny }, action) => {
      // Create allow statements for this action
      if (allow.size > 0) {
        statements.push(
          ...this.createStatementsForAction(action, allow, 'Allow'),
        );
      }

      // Create deny statements for this action
      if (deny.size > 0) {
        statements.push(
          ...this.createStatementsForAction(action, deny, 'Deny'),
        );
      }
    });

    // Create and return the policy
    return new Policy(
      this.bucket.stack,
      'StorageAccess' + this.generatePolicyId(),
      {
        document: new PolicyDocument({
          statements,
        }),
      },
    );
  };

  /**
   * Creates policy statements for a specific action and effect.
   * Handles the mapping of storage actions to S3 permissions.
   */
  private createStatementsForAction = (
    action: InternalStorageAction,
    paths: Set<StoragePath>,
    effect: 'Allow' | 'Deny',
  ): PolicyStatement[] => {
    const pathArray = Array.from(paths);

    switch (action) {
      case 'get':
        return [this.createObjectStatement('s3:GetObject', pathArray, effect)];

      case 'write':
        return [this.createObjectStatement('s3:PutObject', pathArray, effect)];

      case 'delete':
        return [
          this.createObjectStatement('s3:DeleteObject', pathArray, effect),
        ];

      case 'list':
        return [this.createListStatement(pathArray, effect)];

      default:
        throw new Error('Unknown storage action: ' + String(action));
    }
  };

  /**
   * Creates a policy statement for object-level S3 operations.
   */
  private createObjectStatement = (
    s3Action: string,
    paths: StoragePath[],
    effect: 'Allow' | 'Deny',
  ): PolicyStatement => {
    const resources = paths.map((path) => `${this.bucket.bucketArn}/${path}`);

    return new PolicyStatement({
      effect: Effect[effect.toUpperCase() as keyof typeof Effect],
      actions: [s3Action],
      resources,
    });
  };

  /**
   * Creates a policy statement for S3 ListBucket operations with prefix conditions.
   */
  private createListStatement = (
    paths: StoragePath[],
    effect: 'Allow' | 'Deny',
  ): PolicyStatement => {
    // Convert paths to prefix conditions
    const prefixes = paths.flatMap((path) => [
      path, // Include the full path pattern
      path.replace('/*', '/'), // Include the directory path
    ]);

    return new PolicyStatement({
      effect: Effect[effect.toUpperCase() as keyof typeof Effect],
      actions: ['s3:ListBucket'],
      resources: [this.bucket.bucketArn],
      conditions: {
        StringLike: {
          's3:prefix': prefixes,
        },
      },
    });
  };

  /**
   * Generates a unique identifier for policy naming.
   */
  private generatePolicyId = (): string => {
    return Math.random().toString(36).substring(2, 15) || 'policy';
  };
}
