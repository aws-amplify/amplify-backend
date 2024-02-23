import {
  ConstructContainerEntryGenerator,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
} from '@aws-amplify/plugin-types';
import { AmplifyStorage, AmplifyStorageTriggerEvent } from './construct.js';
import { StorageAccessPolicyArbiterFactory } from './storage_access_policy_arbiter.js';
import { AmplifyStorageFactoryProps, RoleAccessBuilder } from './types.js';
import { roleAccessBuilder as _roleAccessBuilder } from './access_builder.js';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { AccessDefinitionTranslator } from './action_to_resources_map.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';
import { validateStorageAccessPaths as _validateStorageAccessPaths } from './validate_storage_access_paths.js';

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
    private readonly roleAccessBuilder: RoleAccessBuilder = _roleAccessBuilder,
    private readonly validateStorageAccessPaths = _validateStorageAccessPaths
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

    this.validateStorageAccessPaths(Object.keys(accessDefinition));

    // generate the ssm environment context necessary to access the s3 bucket (in this case, just the bucket name)
    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.props.name}_BUCKET_NAME`]:
          amplifyStorage.resources.bucket.bucketName,
      });

    // we pass the access definition along with other dependencies to the bucketPolicyArbiter
    const bucketPolicyArbiter = this.bucketPolicyArbiterFactory.getInstance(
      accessDefinition,
      this.getInstanceProps,
      ssmEnvironmentEntries,
      new AccessDefinitionTranslator(
        new StorageAccessPolicyFactory(amplifyStorage.resources.bucket)
      )
    );

    // the arbiter generates policies according to the accessDefinition and attaches the policies to appropriate roles
    bucketPolicyArbiter.arbitratePolicies();

    return amplifyStorage;
  };
}
