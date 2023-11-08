import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { DeployedBackendIdentifier } from './deployed_backend_identifier.js';
import {
  AppNameAndBranchBackendIdentifier,
  AppNameAndBranchMainStackNameResolver,
} from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';
import {
  PassThroughMainStackNameResolver,
  StackIdentifier,
} from './stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import { BackendIdentifierPartsMainStackNameResolver } from './stack-name-resolvers/unique_deployment_identifier_main_stack_name_resolver.js';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';
import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

/**
 * Asserts that a BackendIdentifier is a BackendIdentifierParts
 */
export const isBackendIdentifierParts = (
  backendIdentifier: DeployedBackendIdentifier
): backendIdentifier is BackendIdentifierParts => {
  return (
    'backendId' in backendIdentifier &&
    'disambiguator' in backendIdentifier &&
    'toStackName' in backendIdentifier
  );
};
/**
 * Asserts that a BackendIdentifier is a AppNameAndBranchBackendIdentifier
 */
export const isAppNameAndBranchIdentifier = (
  backendIdentifier: DeployedBackendIdentifier
): backendIdentifier is AppNameAndBranchBackendIdentifier => {
  return 'appName' in backendIdentifier;
};
/**
 * Asserts that a BackendIdentifier is a StackIdentifier
 */
export const isStackIdentifier = (
  backendIdentifier: DeployedBackendIdentifier
): backendIdentifier is StackIdentifier => {
  return 'stackName' in backendIdentifier;
};
/**
 * Constructs an OutputRetrievalStrategy depending on the type of StackIdentifier
 */
export class BackendOutputFetcherFactory {
  /**
   * Instantiates the factory
   */
  constructor(
    private cfnClient: CloudFormationClient,
    private amplifyClient: AmplifyClient
  ) {}
  getStrategy = (backendIdentifier: DeployedBackendIdentifier) => {
    if (isStackIdentifier(backendIdentifier)) {
      return new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new PassThroughMainStackNameResolver(backendIdentifier)
      );
    } else if (isBackendIdentifierParts(backendIdentifier)) {
      return new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new BackendIdentifierPartsMainStackNameResolver(backendIdentifier)
      );
    }
    return new StackMetadataBackendOutputRetrievalStrategy(
      this.cfnClient,
      new AppNameAndBranchMainStackNameResolver(
        this.amplifyClient,
        backendIdentifier
      )
    );
  };
}
