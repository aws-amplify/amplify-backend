import {
  ConstructContainerEntryGenerator,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
} from '@aws-amplify/plugin-types';
import { AmplifyStorage, AmplifyStorageTriggerEvent } from './construct.js';
import { StorageAccessOrchestratorFactory } from './storage_access_orchestrator.js';
import { AmplifyStorageFactoryProps } from './types.js';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';
import { validateResourceName } from '@aws-amplify/platform-core';

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
    private readonly storageAccessOrchestratorFactory: StorageAccessOrchestratorFactory = new StorageAccessOrchestratorFactory()
  ) {}

  generateContainerEntry = ({
    scope,
    ssmEnvironmentEntriesGenerator,
  }: GenerateContainerEntryProps) => {
    validateResourceName(this.props.name);
    const sanitizedName = this.sanitizeName(this.props.name);
    const amplifyStorage = new AmplifyStorage(scope, sanitizedName, {
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

    // generate the ssm environment context necessary to access the s3 bucket (in this case, just the bucket name)
    const ssmEnvironmentEntries =
      ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.props.name}_BUCKET_NAME`]:
          amplifyStorage.resources.bucket.bucketName,
      });

    // we pass the access definition along with other dependencies to the storageAccessOrchestrator
    const storageAccessOrchestrator =
      this.storageAccessOrchestratorFactory.getInstance(
        this.props.access,
        this.getInstanceProps,
        ssmEnvironmentEntries,
        new StorageAccessPolicyFactory(amplifyStorage.resources.bucket)
      );

    // the orchestrator generates policies according to the accessDefinition and attaches the policies to appropriate roles
    storageAccessOrchestrator.orchestrateStorageAccess();

    return amplifyStorage;
  };

  /**
   * Bucket name cannot contain underscores, spaces or upper case characters
   * https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
   */
  private sanitizeName = (name: string): string => {
    return name.replace(/[\s_]+/g, '').toLowerCase();
  };
}
