import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { StorageAccessDefinition, StoragePrefix } from './types.js';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';
import { AcceptorTokenAccessMap } from './action_to_resources_map.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class StorageAccessPolicyArbiter {
  /**
   * Instantiate with context from the storage factory
   */
  constructor(
    private readonly name: string,
    private readonly accessDefinition: Record<
      StoragePrefix,
      StorageAccessDefinition[]
    >,
    private readonly ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly bucket: IBucket,
    private readonly storageAccessPolicyFactory = new StorageAccessPolicyFactory(
      bucket
    )
  ) {}

  /**
   * Responsible for creating bucket policies corresponding to the definition,
   * then invoking the corresponding ResourceAccessAcceptor to accept the policies
   */
  arbitratePolicies = () => {
    const acceptorTokenAccessMap = new AcceptorTokenAccessMap();

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

          acceptorTokenAccessMap.set(
            resourceAccessAcceptor,
            permission.actions,
            prefix
          );
        });
      }
    );

    // generate the ssm environment context necessary to access the s3 bucket (in this case, just the bucket name)
    const ssmEnvironmentEntries =
      this.ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.name}_BUCKET_NAME`]: this.bucket.bucketName,
      });

    // iterate over the access map entries and invoke each ResourceAccessAcceptor to accept the permissions
    acceptorTokenAccessMap
      .getAccessList()
      .forEach(({ actionMap, acceptor }) => {
        acceptor.acceptResourceAccess(
          this.storageAccessPolicyFactory.createPolicy(
            actionMap.getActionToS3PrefixMap()
          ),
          ssmEnvironmentEntries
        );
      });
  };
}

/**
 * This factory is really only necessary for allowing us to mock the BucketPolicyArbiter in tests
 */
export class StorageAccessPolicyArbiterFactory {
  getInstance = (
    name: string,
    accessDefinition: Record<StoragePrefix, StorageAccessDefinition[]>,
    ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    bucket: IBucket,
    bucketPolicyFactory = new StorageAccessPolicyFactory(bucket)
  ) =>
    new StorageAccessPolicyArbiter(
      name,
      accessDefinition,
      ssmEnvironmentEntriesGenerator,
      getInstanceProps,
      bucket,
      bucketPolicyFactory
    );
}
