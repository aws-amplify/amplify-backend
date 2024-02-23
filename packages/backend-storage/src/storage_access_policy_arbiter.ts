import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { StorageAccessDefinition, StoragePrefix } from './types.js';
import { AccessDefinitionTranslator } from './action_to_resources_map.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class StorageAccessPolicyArbiter {
  /**
   * Instantiate with context from the storage factory
   */
  constructor(
    private readonly accessDefinition: Record<
      StoragePrefix,
      StorageAccessDefinition[]
    >,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly ssmEnvironmentEntries: SsmEnvironmentEntry[],
    private readonly accessDefinitionTranslator: AccessDefinitionTranslator
  ) {}

  /**
   * Responsible for creating bucket policies corresponding to the definition,
   * then invoking the corresponding ResourceAccessAcceptor to accept the policies
   */
  arbitratePolicies = () => {
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
            '{owner}',
            permission.ownerPlaceholderSubstitution
          ) as StoragePrefix;

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
export class StorageAccessPolicyArbiterFactory {
  getInstance = (
    accessDefinition: Record<StoragePrefix, StorageAccessDefinition[]>,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    ssmEnvironmentEntries: SsmEnvironmentEntry[],
    accessDefinitionTranslator: AccessDefinitionTranslator
  ) =>
    new StorageAccessPolicyArbiter(
      accessDefinition,
      getInstanceProps,
      ssmEnvironmentEntries,
      accessDefinitionTranslator
    );
}
