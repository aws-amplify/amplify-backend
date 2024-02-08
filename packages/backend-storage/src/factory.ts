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
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  RoleAccessBuilder,
  StorageAccessDefinition,
  storageAccessBuilder,
} from './access_builder.js';
import { BucketPolicyFactory, Permission } from './policy_factory.js';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type StoragePrefix = `/${string}/*` | '/*';

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
> & {
  access?: (
    allow: RoleAccessBuilder
  ) => Record<StoragePrefix, StorageAccessDefinition[]>;
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
    this.validateName(this.props.name);
    if (!this.generator) {
      this.generator = new AmplifyStorageGenerator(
        this.props,
        getInstanceProps
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyStorage;
  };

  private validateName = (name: string): void => {
    const nameIsAlphanumeric = /^[a-zA-Z0-9]+$/.test(name);
    if (!nameIsAlphanumeric) {
      throw new AmplifyUserError('InvalidResourceNameError', {
        message: `defineStorage name can only contain alphanumeric characters, found ${name}`,
        resolution:
          'Change the name parameter of defineStorage to only use alphanumeric characters',
      });
    }
  };
}

class AmplifyStorageGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'storage';

  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps
  ) {}

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
  }: GenerateContainerEntryProps) => {
    const amplifyStorage = new AmplifyStorage(scope, this.props.name, {
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
    const accessDefinition = this.props.access?.(storageAccessBuilder);
    if (!accessDefinition) {
      return;
    }

    const accessMap: Map<ResourceAccessAcceptor, Permission[]> = new Map();

    Object.entries(accessDefinition).forEach(
      ([s3Prefix, accessPermissions]) => {
        accessPermissions.forEach((permission) => {
          const resourceAccessAcceptor =
            permission.getResourceAccessAcceptor(getInstanceProps);
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

    const bucketPolicyFactory = new BucketPolicyFactory(bucket);

    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.props.name}_BUCKET_NAME`]: bucket.bucketName,
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
