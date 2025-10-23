import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  InternalStorageAction,
  StorageAccessPolicyFactory,
  StorageAction,
  StoragePath,
} from './storage_access_policy_factory.js';

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
    const roleId = role.roleArn;

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
    this.acceptorAccessMap.forEach(({ role, accessMap }) => {
      if (accessMap.size === 0) {
        return;
      }
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
    const entityIdToken = '{entity_id}';
    let result = s3Prefix.replace(entityIdToken, idSubstitution);

    // Handle owner paths - remove extra wildcard
    if (result.endsWith('/*/*')) {
      result = result.slice(0, -2);
    }

    return result as StoragePath;
  };
}
