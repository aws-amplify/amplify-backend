import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { DataClientConfigContributor } from './client-config-contributor/data_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './client-config-contributor/storage_client_config_contributor.js';
import {
  StackIdentifier,
  StackNameMainStackNameResolver,
} from './stack-name-resolvers/stack_name_main_stack_name_resolver.js';
import { UniqueBackendIdentifierMainStackNameResolver } from './stack-name-resolvers/unique_deployment_identifier_main_stack_name_resolver.js';
import {
  AppNameAndBranchBackendIdentifier,
  AppNameAndBranchMainStackNameResolver,
} from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  AppIdAndBranchBackendIdentifier,
  AppIdAndBranchMainStackNameResolver,
} from './stack-name-resolvers/app_id_and_branch_main_stack_name_resolver.js';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  private readonly cfnClient: CloudFormationClient;
  private readonly amplifyClient: AmplifyClient;
  private readonly clientConfigContributors = [
    new AuthClientConfigContributor(),
    new DataClientConfigContributor(),
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
   * Initialize a ClientConfigGenerator given a stack name.
   *
   * This can be used when the stack with Amplify resource outputs does not match any known convention.
   * This would be the case when using Amplify constructs in a native CDK app.
   */
  fromStackIdentifier(stackIdentifier: StackIdentifier): ClientConfigGenerator {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new StackNameMainStackNameResolver(stackIdentifier)
      ),
      this.clientConfigContributors
    );
  }

  /**
   * Initialize a ClientConfigGenerator given a UniqueBackendIdentifier
   *
   * This can be used by sandbox deployments, or other deployments that are not linked to an Amplify app
   */
  fromUniqueBackendIdentifier(
    uniqueDeploymentIdentifier: UniqueBackendIdentifier
  ): ClientConfigGenerator {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new UniqueBackendIdentifierMainStackNameResolver(
          uniqueDeploymentIdentifier
        )
      ),
      this.clientConfigContributors
    );
  }

  /**
   * Initialize a ClientConfigGenerator given an appName and branch.
   *
   * This entry point can only be used if appName is unique within the AWS Account and Region that are being used.
   * If appName is not unique, use fromAppIdAndBranch instead to specify a specific Amplify AppId.
   */
  fromAppNameAndBranch(
    appNameAndBranch: AppNameAndBranchBackendIdentifier
  ): ClientConfigGenerator {
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
  }

  /**
   * Initialize a ClientConfigGenerator given an appId and branch
   */
  fromAppIdAndBranch(
    appIdAndBranch: AppIdAndBranchBackendIdentifier
  ): ClientConfigGenerator {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new AppIdAndBranchMainStackNameResolver(
          this.amplifyClient,
          appIdAndBranch
        )
      ),
      this.clientConfigContributors
    );
  }
}
