import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { StorageAccessDefinition, StoragePath } from './types.js';
import { StorageAccessArbiter } from './storage_access_arbiter.js';
import { ownerPathPartToken } from './constants.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class StorageAccessOrchestrator {
  /**
   * Instantiate with context from the storage factory
   */
  constructor(
    private readonly accessDefinition: Record<
      StoragePath,
      StorageAccessDefinition[]
    >,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly ssmEnvironmentEntries: SsmEnvironmentEntry[],
    private readonly accessDefinitionTranslator: StorageAccessArbiter
  ) {}

  /**
   * Translates the accessDefinition into the AccessDefinitionTranslator and invokes the translator to generate policies and attach them to the corresponding ResourceAccessAcceptor
   * Responsible for creating bucket policies corresponding to the definition,
   * then invoking the corresponding ResourceAccessAcceptor to accept the policies
   */
  orchestrateStorageAccess = () => {
    // iterate over the access definition and group permissions by ResourceAccessAcceptor
    Object.entries(this.accessDefinition).forEach(
      // in the access definition, permissions are grouped by storage prefix
      ([s3Prefix, accessPermissions]) => {
        // iterate over all of the access definitions for a given prefix
        accessPermissions.forEach((permission) => {
          // get the ResourceAccessAcceptor for the permission and add it to the map if not already present
          const resourceAccessAcceptor = permission.getResourceAccessAcceptor(
            this.getInstanceProps
          );

          // make the owner placeholder substitution in the s3 prefix
          const prefix = s3Prefix.replaceAll(
            ownerPathPartToken,
            permission.ownerPlaceholderSubstitution
          ) as StoragePath;

          // set an entry that maps this permission to the resource acceptor
          this.accessDefinitionTranslator.addAccessDefinition(
            resourceAccessAcceptor,
            permission.actions,
            prefix
          );
        });
      }
    );

    // iterate over the access map entries and invoke each ResourceAccessAcceptor to accept the permissions
    this.accessDefinitionTranslator.attachPolicies(this.ssmEnvironmentEntries);
  };
}

/**
 * This factory is really only necessary for allowing us to mock the BucketPolicyArbiter in tests
 */
export class StorageAccessOrchestratorFactory {
  getInstance = (
    accessDefinition: Record<StoragePath, StorageAccessDefinition[]>,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    ssmEnvironmentEntries: SsmEnvironmentEntry[],
    accessDefinitionTranslator: StorageAccessArbiter
  ) =>
    new StorageAccessOrchestrator(
      accessDefinition,
      getInstanceProps,
      ssmEnvironmentEntries,
      accessDefinitionTranslator
    );
}
