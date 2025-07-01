import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  InternalStorageAction,
  StorageAccessPolicyFactory,
  StorageAction,
  StoragePath,
} from './storage_access_policy_factory.js';
import { entityIdPathToken, entityIdSubstitution } from './constants.js';
import { validateStorageAccessPaths } from './validate_storage_access_paths.js';

/**
 * Represents a single access definition that maps a storage path to specific permissions
 * for a particular IAM role. This is the fundamental unit of access control processing.
 */
export type StorageAccessDefinition = {
  /** The IAM role that will receive the permissions */
  role: IRole;
  /** Array of high-level storage actions (read, write, delete) to grant */
  actions: StorageAction[];
  /** Pattern for substituting entity IDs in paths ('*' for general access, specific pattern for owner access) */
  idSubstitution: string;
};

/**
 * The StorageAccessOrchestrator is the central coordinator for converting high-level
 * storage access configurations into concrete IAM policies attached to roles.
 *
 * This class handles the complex logic of:
 * - Converting storage actions to S3 permissions
 * - Managing path-based access control with deny-by-default semantics
 * - Handling entity ID substitution for owner-based access
 * - Optimizing policies by removing redundant sub-paths
 * - Creating and attaching IAM policies to the appropriate roles
 *
 * The orchestrator uses a two-phase approach:
 * 1. Collection Phase: Gather all access definitions and organize by role
 * 2. Execution Phase: Create policies and attach them to roles
 * @example
 * ```typescript
 * const policyFactory = new StorageAccessPolicyFactory(bucket);
 * const orchestrator = new StorageAccessOrchestrator(policyFactory);
 *
 * orchestrator.orchestrateStorageAccess({
 *   'public/*': [
 *     { role: authenticatedRole, actions: ['read'], idSubstitution: '*' }
 *   ],
 *   'private/{entity_id}/*': [
 *     { role: authenticatedRole, actions: ['read', 'write'], idSubstitution: '${cognito-identity.amazonaws.com:sub}' }
 *   ]
 * });
 * ```
 */
export class StorageAccessOrchestrator {
  /**
   * Maps role identifiers to their access configurations.
   * This accumulates all access definitions during the collection phase.
   *
   * Key: Role node ID (for consistent identification)
   * Value: Object containing the role and its accumulated access map
   */
  private acceptorAccessMap = new Map<
    string,
    {
      role: IRole;
      accessMap: Map<
        InternalStorageAction,
        { allow: Set<StoragePath>; deny: Set<StoragePath> }
      >;
    }
  >();

  /**
   * Maps storage paths to arrays of deny-by-default callback functions.
   * This is used to implement hierarchical access control where parent paths
   * can have access denied to specific sub-paths.
   *
   * Key: Storage path
   * Value: Array of functions that add deny rules for child paths
   */
  private prefixDenyMap = new Map<
    StoragePath,
    Array<(path: StoragePath) => void>
  >();

  /**
   * Creates a new StorageAccessOrchestrator instance.
   * @param policyFactory - Factory for creating IAM policy documents from access maps
   */
  constructor(private readonly policyFactory: StorageAccessPolicyFactory) {}

  /**
   * Main orchestration method that processes access definitions and creates IAM policies.
   * This is the primary entry point for the orchestrator.
   *
   * The method performs the following steps:
   * 1. Validates all storage paths for correctness and compliance
   * 2. Processes each access definition and groups by role
   * 3. Expands high-level actions (like 'read') to specific S3 permissions
   * 4. Applies entity ID substitution for owner-based access
   * 5. Implements deny-by-default logic for hierarchical paths
   * 6. Creates optimized IAM policies
   * 7. Attaches policies to the appropriate roles
   * @param accessDefinitions - Map of storage paths to arrays of access definitions
   * @throws {Error} When storage paths are invalid or violate access control rules
   * @example
   * ```typescript
   * orchestrator.orchestrateStorageAccess({
   *   'public/*': [
   *     { role: guestRole, actions: ['read'], idSubstitution: '*' },
   *     { role: authRole, actions: ['read', 'write'], idSubstitution: '*' }
   *   ],
   *   'private/{entity_id}/*': [
   *     { role: authRole, actions: ['read', 'write', 'delete'], idSubstitution: '${cognito-identity.amazonaws.com:sub}' }
   *   ]
   * });
   * ```
   */
  orchestrateStorageAccess = (
    accessDefinitions: Record<StoragePath, StorageAccessDefinition[]>,
  ) => {
    // Phase 1: Validation
    // Validate all storage paths before processing to catch errors early
    const allPaths = Object.keys(accessDefinitions);
    validateStorageAccessPaths(allPaths);

    this.validateAccessDefinitionUniqueness(accessDefinitions);

    // Phase 2: Collection
    // Process each path and its access definitions, grouping by role
    Object.entries(accessDefinitions).forEach(([s3Prefix, definitions]) => {
      definitions.forEach((definition) => {
        // Expand high-level actions to specific S3 permissions
        // 'read' becomes ['get', 'list'], others remain as-is
        const internalActions = definition.actions.flatMap((action) =>
          action === 'read' ? (['get', 'list'] as const) : [action],
        ) as InternalStorageAction[];

        // Remove duplicate actions to avoid redundant policy statements
        const uniqueActions = Array.from(new Set(internalActions));

        // Apply entity ID substitution to the storage path
        // This converts '{entity_id}' tokens to actual substitution patterns
        const processedPrefix = this.applyIdSubstitution(
          s3Prefix as StoragePath,
          definition.idSubstitution,
        );

        // Add this access definition to the role's access map
        this.addAccessDefinition(
          definition.role,
          uniqueActions,
          processedPrefix,
        );
      });
    });

    // Phase 3: Execution
    // Create and attach IAM policies to roles
    this.attachPolicies();
  };

  /**
   * Adds an access definition to a role's accumulated access map.
   * This method groups all access definitions by role to enable policy consolidation.
   * @param role - The IAM role that will receive the permissions
   * @param actions - Array of internal storage actions (get, list, write, delete)
   * @param s3Prefix - The processed storage path (with entity substitution applied)
   * @private
   */
  private addAccessDefinition = (
    role: IRole,
    actions: InternalStorageAction[],
    s3Prefix: StoragePath,
  ) => {
    // Use role node ID for consistent identification across multiple calls
    const roleId = role.node.id;

    // Initialize role entry if this is the first access definition for this role
    if (!this.acceptorAccessMap.has(roleId)) {
      this.acceptorAccessMap.set(roleId, {
        role,
        accessMap: new Map(),
      });
    }

    // Get the role's access map for accumulating permissions
    const accessMap = this.acceptorAccessMap.get(roleId)!.accessMap;

    // Process each action and add to the role's access map
    actions.forEach((action) => {
      if (!accessMap.has(action)) {
        // First time seeing this action for this role - create new sets
        const allowSet = new Set<StoragePath>([s3Prefix]);
        const denySet = new Set<StoragePath>();
        accessMap.set(action, { allow: allowSet, deny: denySet });

        // Register this path for potential deny-by-default processing
        this.setPrefixDenyMapEntry(s3Prefix, allowSet, denySet);
      } else {
        // Action already exists for this role - add to existing sets
        const { allow: allowSet, deny: denySet } = accessMap.get(action)!;
        allowSet.add(s3Prefix);

        // Register this path for potential deny-by-default processing
        this.setPrefixDenyMapEntry(s3Prefix, allowSet, denySet);
      }
    });
  };

  /**
   * Creates and attaches IAM policies to roles based on accumulated access definitions.
   * This method implements the deny-by-default logic and policy optimization.
   *
   * The method performs several key operations:
   * 1. Applies deny-by-default logic for parent-child path relationships
   * 2. Optimizes policies by removing redundant sub-paths
   * 3. Creates IAM policy documents using the policy factory
   * 4. Attaches policies to the appropriate roles
   * 5. Cleans up internal state for potential reuse
   * @private
   */
  private attachPolicies = () => {
    // Phase 1: Apply deny-by-default logic for hierarchical path access
    // This ensures that if a parent path grants access, but a child path has
    // different access rules, the parent access is explicitly denied on the child
    const allPaths = Array.from(this.prefixDenyMap.keys());

    allPaths.forEach((storagePath) => {
      // Find if this path has a parent path in the access definitions
      const parent = this.findParent(storagePath, allPaths);

      // Skip deny-by-default logic if:
      // - No parent path exists
      // - This is an owner path with entity substitution (special case)
      if (
        !parent ||
        parent === storagePath.replaceAll(`${entityIdSubstitution}/`, '')
      ) {
        return;
      }

      // Apply deny-by-default: for each policy that grants access to the parent path,
      // add explicit deny statements for this child path
      this.prefixDenyMap
        .get(parent)
        ?.forEach((denyByDefaultCallback) =>
          denyByDefaultCallback(storagePath),
        );
    });

    // Phase 2: Create and attach policies for each role
    this.acceptorAccessMap.forEach(({ role, accessMap }) => {
      // Skip roles with no access definitions
      if (accessMap.size === 0) {
        return;
      }

      // Optimize policies by removing sub-paths that are covered by parent paths
      // This reduces policy size and complexity
      accessMap.forEach(({ allow }) => {
        this.removeSubPathsFromSet(allow);
      });

      // Create the IAM policy document using the policy factory
      const policy = this.policyFactory.createPolicy(accessMap);

      // Attach the policy to the role
      role.attachInlinePolicy(policy);
    });

    // Phase 3: Clean up internal state for potential reuse
    this.acceptorAccessMap.clear();
    this.prefixDenyMap.clear();
  };

  /**
   * Registers a storage path for potential deny-by-default processing.
   * This method creates callback functions that can add deny rules for child paths.
   * @param storagePath - The storage path to register
   * @param allowPathSet - Set of paths that are allowed for this action
   * @param denyPathSet - Set of paths that are denied for this action
   * @private
   */
  private setPrefixDenyMapEntry = (
    storagePath: StoragePath,
    allowPathSet: Set<StoragePath>,
    denyPathSet: Set<StoragePath>,
  ) => {
    // Create a callback function that adds deny rules for child paths
    const setDenyByDefault = (denyPath: StoragePath) => {
      // Only add to deny set if not already in allow set
      // This prevents conflicting allow/deny rules for the same path
      if (!allowPathSet.has(denyPath)) {
        denyPathSet.add(denyPath);
      }
    };

    // Register the callback for this storage path
    if (!this.prefixDenyMap.has(storagePath)) {
      this.prefixDenyMap.set(storagePath, [setDenyByDefault]);
    } else {
      this.prefixDenyMap.get(storagePath)?.push(setDenyByDefault);
    }
  };

  /**
   * Applies entity ID substitution to a storage path.
   * This method handles the conversion of '{entity_id}' tokens to actual
   * substitution patterns used in IAM policies.
   * @param s3Prefix - The original storage path (may contain {entity_id} tokens)
   * @param idSubstitution - The substitution pattern to use
   * @returns The processed storage path with substitutions applied
   * @example
   * ```typescript
   * // Owner access with entity substitution
   * applyIdSubstitution('private/{entity_id}/*', '${cognito-identity.amazonaws.com:sub}')
   * // Returns: 'private/${cognito-identity.amazonaws.com:sub}/*'
   *
   * // General access with wildcard
   * applyIdSubstitution('public/*', '*')
   * // Returns: 'public/*'
   * ```
   * @private
   */
  private applyIdSubstitution = (
    s3Prefix: StoragePath,
    idSubstitution: string,
  ): StoragePath => {
    // Replace all {entity_id} tokens with the provided substitution pattern
    const prefix = s3Prefix.replaceAll(
      entityIdPathToken,
      idSubstitution,
    ) as StoragePath;

    // Special case: for owner paths that end with '/*/*', remove the last wildcard
    // This handles the case where entity substitution creates double wildcards
    if (prefix.endsWith('/*/*')) {
      return prefix.slice(0, -2) as StoragePath;
    }

    return prefix as StoragePath;
  };

  /**
   * Finds the parent path of a given path from a list of paths.
   * A parent path is one that is a prefix of the given path.
   *
   * Due to upstream validation, there can only be at most one parent path
   * for any given path in a valid access configuration.
   * @param path - The path to find a parent for
   * @param paths - Array of all paths to search through
   * @returns The parent path if found, undefined otherwise
   * @example
   * ```typescript
   * findParent('public/images/*', ['public/*', 'private/*'])
   * // Returns: 'public/*'
   *
   * findParent('admin/*', ['public/*', 'private/*'])
   * // Returns: undefined
   * ```
   * @private
   */
  private findParent = (path: string, paths: string[]) =>
    paths.find((p) => path !== p && path.startsWith(p.replaceAll('*', ''))) as
      | StoragePath
      | undefined;

  /**
   * Removes sub-paths from a set of paths to optimize policy size.
   * If a parent path grants access, there's no need to explicitly grant
   * access to its sub-paths, as they're already covered.
   * @param paths - Set of storage paths to optimize
   * @example
   * ```typescript
   * const paths = new Set(['public/*', 'public/images/*', 'private/*']);
   * removeSubPathsFromSet(paths);
   * // paths now contains: ['public/*', 'private/*']
   * // 'public/images/*' was removed as it's covered by 'public/*'
   * ```
   * @private
   */
  private removeSubPathsFromSet = (paths: Set<StoragePath>) => {
    paths.forEach((path) => {
      // If this path has a parent in the set, remove it as redundant
      if (this.findParent(path, Array.from(paths))) {
        paths.delete(path);
      }
    });
  };

  /**
   * Validates that access definitions are unique within each storage path.
   * This mirrors the uniqueness validation from backend-storage to prevent
   * duplicate access rules that could cause conflicts.
   */
  private validateAccessDefinitionUniqueness = (
    accessDefinitions: Record<StoragePath, StorageAccessDefinition[]>,
  ) => {
    Object.entries(accessDefinitions).forEach(([path, definitions]) => {
      const uniqueDefinitionIdSet = new Set<string>();

      definitions.forEach((definition) => {
        // Create unique identifier combining role and substitution pattern
        const uniqueDefinitionId = `${definition.role.node.id}-${definition.idSubstitution}`;

        if (uniqueDefinitionIdSet.has(uniqueDefinitionId)) {
          throw new Error(
            `Invalid storage access definition. ` +
              `Multiple access rules for the same role and access type are not allowed on path '${path}'. ` +
              `Combine actions into a single rule instead.`,
          );
        }

        uniqueDefinitionIdSet.add(uniqueDefinitionId);
      });
    });
  };
}
