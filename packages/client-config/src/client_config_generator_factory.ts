import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor/graphql_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './client-config-contributor/storage_client_config_contributor.js';
import {
  AppNameAndBranchBackendIdentifier,
  AppNameAndBranchMainStackNameResolver,
  PassThroughMainStackNameResolver,
  StackIdentifier,
  UniqueBackendIdentifierMainStackNameResolver,
} from './stack-name-resolvers/index.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  BackendIdentifier,
  isStackIdentifier,
  isUniqueBackendIdentifier,
} from './generate_client_config.js';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  private readonly cfnClient: CloudFormationClient;
  private readonly amplifyClient: AmplifyClient;
  private readonly clientConfigContributors = [
    new AuthClientConfigContributor(),
    new GraphqlClientConfigContributor(),
    new StorageClientConfigContributor(),
  ];
  /**
   * Provide the factory with AWS credentials. These credentials will be used to configure underlying SDK clients for resolving backend output.
   */
  constructor(
    private readonly credentialProvider: AwsCredentialIdentityProvider
  ) {
    this.cfnClient = new CloudFormationClient({
      credentials: credentialProvider,
    });
    this.amplifyClient = new AmplifyClient({
      credentials: credentialProvider,
    });
  }

  /**
   * Returns a ClientConfigGenerator for the given BackendIdentifier type
   */
  getInstance = (
    backendIdentifier: BackendIdentifier
  ): ClientConfigGenerator => {
    if (isStackIdentifier(backendIdentifier)) {
      return this.fromStackIdentifier(backendIdentifier);
    } else if (isUniqueBackendIdentifier(backendIdentifier)) {
      return this.fromUniqueBackendIdentifier(backendIdentifier);
    }
    return this.fromAppNameAndBranch(backendIdentifier);
  };
  /**
   * Initialize a ClientConfigGenerator given a stack name.
   *
   * This can be used when the stack with Amplify resource outputs does not match any known convention.
   * This would be the case when using Amplify constructs in a native CDK app.
   */
  private fromStackIdentifier = (
    stackIdentifier: StackIdentifier
  ): ClientConfigGenerator => {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new PassThroughMainStackNameResolver(stackIdentifier)
      ),
      this.clientConfigContributors
    );
  };

  /**
   * Initialize a ClientConfigGenerator given a UniqueBackendIdentifier
   */
  private fromUniqueBackendIdentifier = (
    uniqueDeploymentIdentifier: UniqueBackendIdentifier
  ): ClientConfigGenerator => {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new UniqueBackendIdentifierMainStackNameResolver(
          uniqueDeploymentIdentifier
        )
      ),
      this.clientConfigContributors
    );
  };

  /**
   * Initialize a ClientConfigGenerator given an appName and branch.
   *
   * This entry point can only be used if appName is unique within the AWS Account and Region that are being used.
   * If appName is not unique, use fromUniqueBackendIdentifier instead to specify a specific appId.
   */
  private fromAppNameAndBranch = (
    appNameAndBranch: AppNameAndBranchBackendIdentifier
  ): ClientConfigGenerator => {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new AppNameAndBranchMainStackNameResolver(
          this.amplifyClient,
          appNameAndBranch
        )
      ),
      this.clientConfigContributors
    );
  };
}
