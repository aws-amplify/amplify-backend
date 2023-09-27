import { UniqueBackendIdentifier } from '@aws-amplify/platform-core';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendIdentifier } from './backend_identifier.js';
import {
  AppNameAndBranchBackendIdentifier,
  AppNameAndBranchMainStackNameResolver,
} from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';
import {
  PassThroughMainStackNameResolver,
  StackIdentifier,
} from './stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import { UniqueBackendIdentifierMainStackNameResolver } from './stack-name-resolvers/unique_deployment_identifier_main_stack_name_resolver.js';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';

/**
 * Asserts that a BackendIdentifier is a UniqueBackendIdentifier
 */
export const isUniqueBackendIdentifier = (
  backendIdentifier: BackendIdentifier
): backendIdentifier is UniqueBackendIdentifier => {
  return (
    'backendId' in backendIdentifier && 'disambiguator' in backendIdentifier
  );
};
/**
 * Asserts that a BackendIdentifier is a AppNameAndBranchBackendIdentifier
 */
export const isAppNameAndBranchIdentifier = (
  backendIdentifier: BackendIdentifier
): backendIdentifier is AppNameAndBranchBackendIdentifier => {
  return 'appName' in backendIdentifier;
};
/**
 * Asserts that a BackendIdentifier is a StackIdentifier
 */
export const isStackIdentifier = (
  backendIdentifier: BackendIdentifier
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
  getStrategy = (backendIdentifier: BackendIdentifier) => {
    if (isStackIdentifier(backendIdentifier)) {
      return new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new PassThroughMainStackNameResolver(backendIdentifier)
      );
    } else if (isUniqueBackendIdentifier(backendIdentifier)) {
      return new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new UniqueBackendIdentifierMainStackNameResolver(backendIdentifier)
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
