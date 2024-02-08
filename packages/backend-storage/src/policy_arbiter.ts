import {
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { AccessGenerator } from './types.js';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { storageAccessBuilder } from './access_builder.js';
import { BucketPolicyFactory, Permission } from './policy_factory.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class BucketPolicyArbiter {
  /**
   * Instantiate with context from the storage factory
   */
  constructor(
    private readonly name: string,
    private readonly accessGenerator: AccessGenerator,
    private readonly ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly bucket: IBucket,
    private readonly bucketPolicyFactory = new BucketPolicyFactory(bucket)
  ) {}

  /**
   * Responsible for evaluating the access definition,
   * creating bucket policies corresponding to the definition,
   * then invoking the corresponding resource access acceptor to accept the policies
   */
  arbitratePolicies = () => {
    const accessDefinition = this.accessGenerator(storageAccessBuilder);

    const accessMap: Map<ResourceAccessAcceptor, Permission[]> = new Map();

    Object.entries(accessDefinition).forEach(
      ([s3Prefix, accessPermissions]) => {
        accessPermissions.forEach((permission) => {
          const resourceAccessAcceptor = permission.getResourceAccessAcceptor(
            this.getInstanceProps
          );
          if (!accessMap.has(resourceAccessAcceptor)) {
            accessMap.set(resourceAccessAcceptor, []);
          }
          const prefix = s3Prefix.replaceAll(
            '{owner}',
            permission.ownerPlaceholderSubstitution
          );
          accessMap.get(resourceAccessAcceptor)?.push({
            actions: permission.actions,
            resources: [prefix],
          });
        });
      }
    );

    const ssmEnvironmentEntries =
      this.ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.name}_BUCKET_NAME`]: this.bucket.bucketName,
      });

    accessMap.forEach((permissions, resourceAccessAcceptor) => {
      resourceAccessAcceptor.acceptResourceAccess(
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
    accessGenerator: AccessGenerator,
    ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    bucket: IBucket,
    bucketPolicyFactory = new BucketPolicyFactory(bucket)
  ) =>
    new BucketPolicyArbiter(
      name,
      accessGenerator,
      ssmEnvironmentEntriesGenerator,
      getInstanceProps,
      bucket,
      bucketPolicyFactory
    );
}
