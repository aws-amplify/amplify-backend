import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  InternalStorageAction,
  StorageAccessPolicyFactory,
  StorageAction,
  StoragePath,
} from './storage_access_policy_factory.js';
import { entityIdPathToken, entityIdSubstitution } from './constants.js';
import { validateStorageAccessPaths } from './validate_storage_access_paths.js';

export type StorageAccessDefinition = {
  role: IRole;
  actions: StorageAction[];
  idSubstitution: string;
};

/**
 * Orchestrates the process of converting storage access rules into IAM policies
 */
export class StorageAccessOrchestrator {
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

  private prefixDenyMap = new Map<
    StoragePath,
    Array<(path: StoragePath) => void>
  >();

  /**
   * Create orchestrator with policy factory
   * @param policyFactory - Factory for creating IAM policies
   */
  constructor(private readonly policyFactory: StorageAccessPolicyFactory) {}

  /**
   * Process access definitions and attach policies to roles
   * @param accessDefinitions - Map of storage paths to access definitions
   */
  orchestrateStorageAccess = (
    accessDefinitions: Record<StoragePath, StorageAccessDefinition[]>,
  ) => {
    // Validate all paths first
    const allPaths = Object.keys(accessDefinitions);
    validateStorageAccessPaths(allPaths);

    // Process each path and its access definitions
    Object.entries(accessDefinitions).forEach(([s3Prefix, definitions]) => {
      definitions.forEach((definition) => {
        // Replace "read" with "get" and "list"
        const internalActions = definition.actions.flatMap((action) =>
          action === 'read' ? (['get', 'list'] as const) : [action],
        ) as InternalStorageAction[];

        // Remove duplicates
        const uniqueActions = Array.from(new Set(internalActions));

        // Apply ID substitution to path
        const processedPrefix = this.applyIdSubstitution(
          s3Prefix as StoragePath,
          definition.idSubstitution,
        );

        this.addAccessDefinition(
          definition.role,
          uniqueActions,
          processedPrefix,
        );
      });
    });

    // Attach policies to roles
    this.attachPolicies();
  };

  private addAccessDefinition = (
    role: IRole,
    actions: InternalStorageAction[],
    s3Prefix: StoragePath,
  ) => {
    // Use role node ID for consistent grouping
    const roleId = role.node.id;

    if (!this.acceptorAccessMap.has(roleId)) {
      this.acceptorAccessMap.set(roleId, {
        role,
        accessMap: new Map(),
      });
    }

    const accessMap = this.acceptorAccessMap.get(roleId)!.accessMap;

    actions.forEach((action) => {
      if (!accessMap.has(action)) {
        const allowSet = new Set<StoragePath>([s3Prefix]);
        const denySet = new Set<StoragePath>();
        accessMap.set(action, { allow: allowSet, deny: denySet });

        this.setPrefixDenyMapEntry(s3Prefix, allowSet, denySet);
      } else {
        const { allow: allowSet, deny: denySet } = accessMap.get(action)!;
        allowSet.add(s3Prefix);
        this.setPrefixDenyMapEntry(s3Prefix, allowSet, denySet);
      }
    });
  };

  private attachPolicies = () => {
    // Apply deny-by-default logic for parent-child path relationships
    const allPaths = Array.from(this.prefixDenyMap.keys());
    allPaths.forEach((storagePath) => {
      const parent = this.findParent(storagePath, allPaths);
      // do not add to prefix deny map if there is no parent or the path is a subpath with entity id
      if (
        !parent ||
        parent === storagePath.replaceAll(`${entityIdSubstitution}/`, '')
      ) {
        return;
      }
      // if a parent path is defined, invoke the denyByDefault callback on this subpath for all policies that exist on the parent path
      this.prefixDenyMap
        .get(parent)
        ?.forEach((denyByDefaultCallback) =>
          denyByDefaultCallback(storagePath),
        );
    });

    this.acceptorAccessMap.forEach(({ role, accessMap }) => {
      if (accessMap.size === 0) {
        return;
      }
      // Remove subpaths from allow set to prevent unnecessary paths
      accessMap.forEach(({ allow }) => {
        this.removeSubPathsFromSet(allow);
      });

      const policy = this.policyFactory.createPolicy(accessMap);
      role.attachInlinePolicy(policy);
    });

    // Clear state for next use
    this.acceptorAccessMap.clear();
    this.prefixDenyMap.clear();
  };

  private setPrefixDenyMapEntry = (
    storagePath: StoragePath,
    allowPathSet: Set<StoragePath>,
    denyPathSet: Set<StoragePath>,
  ) => {
    const setDenyByDefault = (denyPath: StoragePath) => {
      if (!allowPathSet.has(denyPath)) {
        denyPathSet.add(denyPath);
      }
    };

    if (!this.prefixDenyMap.has(storagePath)) {
      this.prefixDenyMap.set(storagePath, [setDenyByDefault]);
    } else {
      this.prefixDenyMap.get(storagePath)?.push(setDenyByDefault);
    }
  };

  private applyIdSubstitution = (
    s3Prefix: StoragePath,
    idSubstitution: string,
  ): StoragePath => {
    const prefix = s3Prefix.replaceAll(
      entityIdPathToken,
      idSubstitution,
    ) as StoragePath;

    // for owner paths where prefix ends with '/*/*' remove the last wildcard
    if (prefix.endsWith('/*/*')) {
      return prefix.slice(0, -2) as StoragePath;
    }

    return prefix as StoragePath;
  };

  /**
   * Returns the element in paths that is a prefix of path, if any
   * Note that there can only be one at this point because of upstream validation
   */
  private findParent = (path: string, paths: string[]) =>
    paths.find((p) => path !== p && path.startsWith(p.replaceAll('*', ''))) as
      | StoragePath
      | undefined;

  /**
   * Remove subpaths from set to prevent unnecessary paths in policies
   */
  private removeSubPathsFromSet = (paths: Set<StoragePath>) => {
    paths.forEach((path) => {
      if (this.findParent(path, Array.from(paths))) {
        paths.delete(path);
      }
    });
  };
}
