import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendIdentifier } from './generate_client_config.js';
import { StackIdentifier } from './index.js';
import { AppNameAndBranchMainStackNameResolver } from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';
import { PassThroughMainStackNameResolver } from './stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import { UniqueBackendIdentifierMainStackNameResolver } from './stack-name-resolvers/unique_deployment_identifier_main_stack_name_resolver.js';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';

const isUniqueBackendIdentifier = (
  backendIdentifier: BackendIdentifier
): backendIdentifier is UniqueBackendIdentifier => {
  return 'backendId' in backendIdentifier && 'branchName' in backendIdentifier;
};
const isStackIdentifier = (
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
