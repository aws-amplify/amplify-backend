import { Construct } from 'constructs';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceProvider,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import {
  AmplifyStorage,
  AmplifyStorageProps,
  StorageResources,
} from './construct.js';
import {
  EntityAccessBuilder,
  StorageAccess,
  storageAccessBuilder,
} from './access_builder.js';
import { BucketPolicyFactory, Permission } from './policy_factory.js';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
> & {
  access?: (allow: EntityAccessBuilder) => Record<string, StorageAccess[]>;
};

/**
 * Singleton factory for a Storage bucket that can be used in `resource.ts` files
 */
class AmplifyStorageFactory
  implements ConstructFactory<ResourceProvider<StorageResources>>
{
  private generator: ConstructContainerEntryGenerator;
  private ssmEnvironmentEntries: SsmEnvironmentEntry[] | undefined;

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
    const { constructContainer, outputStorageStrategy, importPathVerifier } =
      getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'storage', 'resource'),
      'Amplify Storage must be defined in amplify/storage/resource.ts'
    );
    if (!this.generator) {
      this.generator = new AmplifyStorageGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    const amplifyStorage = constructContainer.getOrCompute(
      this.generator
    ) as AmplifyStorage;

    this.generateAndAttachAccessPolicies(
      getInstanceProps,
      amplifyStorage.resources.bucket
    );

    return amplifyStorage;
  };

  private generateAndAttachAccessPolicies = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
    bucket: IBucket
  ) => {
    const { ssmEnvironmentEntriesGenerator } = getInstanceProps;
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

    // TODO this is a bit unfortunate that this class has to maintain a cache of this value.
    // Ideally the ssmEnvironmentEntriesGenerator would maintain this cache, but there isn't really anything for it to reliably key off of
    if (!this.ssmEnvironmentEntries) {
      this.ssmEnvironmentEntries =
        ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries(bucket, {
          STORAGE_BUCKET_NAME: bucket.bucketName,
        });
    }

    accessMap.forEach((permissions, resourceAccessAcceptor) => {
      resourceAccessAcceptor(
        bucketPolicyFactory.createPolicy(permissions),
        // safe because we checked if it was defined above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.ssmEnvironmentEntries!
      );
    });
  };
}

class AmplifyStorageGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'storage';
  private readonly defaultName = 'amplifyStorage';

  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    return new AmplifyStorage(scope, this.defaultName, {
      ...this.props,
      outputStorageStrategy: this.outputStorageStrategy,
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
