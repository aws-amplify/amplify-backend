import {
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { StoragePrefix } from './types.js';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { StorageAccessDefinition } from './access_builder.js';
import { Permission, StorageAccessPolicyFactory } from './policy_factory.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class BucketPolicyArbiter {
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
    private readonly bucketPolicyFactory = new StorageAccessPolicyFactory(
      bucket
    )
  ) {}

  /**
   * Responsible for creating bucket policies corresponding to the definition,
   * then invoking the corresponding ResourceAccessAcceptor to accept the policies
   */
  arbitratePolicies = () => {
    // initialize a map that will be used to group permissions by ResourceAccessAcceptor
    // (a ResourceAccessAcceptor is a wrapper around an IAM role that is also able to accept additional context via ssm params)
    const accessMap: Map<ResourceAccessAcceptor, Permission[]> = new Map();

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
          if (!accessMap.has(resourceAccessAcceptor)) {
            accessMap.set(resourceAccessAcceptor, []);
          }

          // make the owner placeholder substitution in the s3 prefix
          const prefix = s3Prefix.replaceAll(
            '{owner}',
            permission.ownerPlaceholderSubstitution
          );

          // add the permission actions and resources to the list of permissions for this ResourceAccessAcceptor
          accessMap.get(resourceAccessAcceptor)?.push({
            actions: permission.actions,
            resources: [prefix],
          });
        });
      }
    );

    // generate the ssm environment context necessary to access the s3 bucket (in this case, just the bucket name)
    const ssmEnvironmentEntries =
      this.ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.name}_BUCKET_NAME`]: this.bucket.bucketName,
      });

    // iterate over the access map entries and invoke each ResourceAccessAcceptor to accept the permissions
    accessMap.forEach((permissions, resourceAccessAcceptor) => {
      resourceAccessAcceptor.acceptResourceAccess(
        // generate an IAM policy from the permissions
        this.bucketPolicyFactory.createPolicy(permissions),
        ssmEnvironmentEntries
      );
    });
  };
}

/**
 * This factory is really only necessary for allowing us to mock the BucketPolicyArbiter in tests
 */
export class BucketPolicyArbiterFactory {
  getInstance = (
    name: string,
    accessDefinition: Record<StoragePrefix, StorageAccessDefinition[]>,
    ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    bucket: IBucket,
    bucketPolicyFactory = new StorageAccessPolicyFactory(bucket)
  ) =>
    new BucketPolicyArbiter(
      name,
      accessDefinition,
      ssmEnvironmentEntriesGenerator,
      getInstanceProps,
      bucket,
      bucketPolicyFactory
    );
}
