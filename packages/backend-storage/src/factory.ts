import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceAccessAcceptor,
  ResourceProvider,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import {
  AmplifyStorage,
  AmplifyStorageProps,
  StorageResources,
} from './construct.js';
import {
  RoleAccessBuilder,
  StorageAccessDefinition,
  storageAccessBuilder,
} from './access_builder.js';
import { BucketPolicyFactory, Permission } from './policy_factory.js';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
> & {
  access?: (
    allow: RoleAccessBuilder
  ) => Record<string, StorageAccessDefinition[]>;
};

/**
 * Singleton factory for a Storage bucket that can be used in `resource.ts` files
 */
class AmplifyStorageFactory
  implements ConstructFactory<ResourceProvider<StorageResources>>
{
  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize the bucket
   */
  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly importStack = new Error().stack
  ) {}

  /**
   * Get a singleton instance of the Bucket
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): AmplifyStorage => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'storage', 'resource'),
      'Amplify Storage must be defined in amplify/storage/resource.ts'
    );
    if (!this.generator) {
      this.generator = new AmplifyStorageGenerator(
        this.props,
        getInstanceProps
      );
    }
    const amplifyStorage = constructContainer.getOrCompute(
      this.generator
    ) as AmplifyStorage;

    return amplifyStorage;
  };
}

class AmplifyStorageGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'storage';
  private readonly defaultName = 'amplifyStorage';

  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps
  ) {}

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
  }: GenerateContainerEntryProps) => {
    const amplifyStorage = new AmplifyStorage(scope, this.defaultName, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    this.generateAndAttachAccessPolicies(
      ssmEnvironmentEntriesGenerator,
      this.getInstanceProps,
      amplifyStorage.resources.bucket
    );

    return amplifyStorage;
  };

  private generateAndAttachAccessPolicies = (
    ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    bucket: IBucket
  ) => {
    const accessDefinition = this.props.access?.(storageAccessBuilder) || {};

    const accessMap: Map<ResourceAccessAcceptor, Permission[]> = new Map();

    Object.entries(accessDefinition).forEach(
      ([s3Prefix, accessPermissions]) => {
        accessPermissions.forEach((permission) => {
          const resourceAccessAcceptor =
            permission.getResourceAccessAcceptor(getInstanceProps);
          if (!accessMap.has(resourceAccessAcceptor)) {
            accessMap.set(resourceAccessAcceptor, []);
          }
          const prefix = `${s3Prefix}/${permission.resourceSuffix}`;
          accessMap.get(resourceAccessAcceptor)?.push({
            actions: permission.actions,
            resources: [prefix],
          });
        });
      }
    );

    const bucketPolicyFactory = new BucketPolicyFactory(bucket);

    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries(bucket, {
        STORAGE_BUCKET_NAME: bucket.bucketName,
      });

    accessMap.forEach((permissions, resourceAccessAcceptor) => {
      resourceAccessAcceptor.acceptResourceAccess(
        bucketPolicyFactory.createPolicy(permissions),
        ssmEnvironmentEntries
      );
    });
  };
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyStorage>
 */
export const defineStorage = (
  props: AmplifyStorageFactoryProps
): ConstructFactory<ResourceProvider<StorageResources>> =>
  new AmplifyStorageFactory(props, new Error().stack);
