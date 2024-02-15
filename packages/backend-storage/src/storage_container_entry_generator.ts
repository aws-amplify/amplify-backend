import {
  ConstructContainerEntryGenerator,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
} from '@aws-amplify/plugin-types';
import { AmplifyStorage } from './construct.js';
import { StorageAccessPolicyArbiterFactory } from './storage_access_policy_arbiter.js';
import {
  AmplifyStorageFactoryProps,
  AmplifyStorageTriggerEvent,
} from './types.js';
import {
  RoleAccessBuilder,
  roleAccessBuilder as _roleAccessBuilder,
} from './access_builder.js';
import { EventType } from 'aws-cdk-lib/aws-s3';

/**
 * Generates a single instance of storage resources
 */
export class StorageContainerEntryGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName = 'storage';

  /**
   * Initialize with context from storage factory
   */
  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly bucketPolicyArbiterFactory: StorageAccessPolicyArbiterFactory = new StorageAccessPolicyArbiterFactory(),
    private readonly roleAccessBuilder: RoleAccessBuilder = _roleAccessBuilder
  ) {}

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
  }: GenerateContainerEntryProps) => {
    const amplifyStorage = new AmplifyStorage(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    Object.entries(this.props.triggers || {}).forEach(
      ([triggerEvent, handlerFactory]) => {
        const events = [];
        const handler = handlerFactory.getInstance(this.getInstanceProps)
          .resources.lambda;
        // triggerEvent is converted string from Object.entries
        switch (triggerEvent as AmplifyStorageTriggerEvent) {
          case 'onDelete':
            events.push(EventType.OBJECT_REMOVED);
            break;
          case 'onUpload':
            events.push(EventType.OBJECT_CREATED);
            break;
        }
        amplifyStorage.addTrigger(events, handler);
      }
    );

    if (!this.props.access) {
      return amplifyStorage;
    }

    // props.access is the access callback defined by the customer
    // here we inject the roleAccessBuilder into the callback and run it
    // this produces the access definition that will be used to create the storage policies
    const accessDefinition = this.props.access(this.roleAccessBuilder);

    // we pass the access definition along with other dependencies to the bucketPolicyArbiter
    const bucketPolicyArbiter = this.bucketPolicyArbiterFactory.getInstance(
      this.props.name,
      accessDefinition,
      ssmEnvironmentEntriesGenerator,
      this.getInstanceProps,
      amplifyStorage.resources.bucket
    );

    // the arbiter generates policies according to the accessDefinition and attaches the policies to appropriate roles
    bucketPolicyArbiter.arbitratePolicies();

    return amplifyStorage;
  };
}
