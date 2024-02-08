import {
  ConstructContainerEntryGenerator,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
} from '@aws-amplify/plugin-types';
import { AmplifyStorage } from './construct.js';
import { BucketPolicyArbiterFactory } from './policy_arbiter.js';
import { AmplifyStorageFactoryProps } from './types.js';

/**
 * Generates a single instance of storage resources
 */
export class StorageGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'storage';

  /**
   * Initialize with context from storage factory
   */
  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly bucketPolicyArbiterFactory: BucketPolicyArbiterFactory = new BucketPolicyArbiterFactory()
  ) {}

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
  }: GenerateContainerEntryProps) => {
    const amplifyStorage = new AmplifyStorage(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    if (!this.props.access) {
      return amplifyStorage;
    }

    const bucketPolicyArbiter = this.bucketPolicyArbiterFactory.getInstance(
      this.props.name,
      this.props.access,
      ssmEnvironmentEntriesGenerator,
      this.getInstanceProps,
      amplifyStorage.resources.bucket
    );

    bucketPolicyArbiter.arbitratePolicies();

    return amplifyStorage;
  };
}
