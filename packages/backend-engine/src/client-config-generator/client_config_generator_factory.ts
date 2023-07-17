import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { SSMClient } from '@aws-sdk/client-ssm';
import { StackMetadataBackendOutputRetrievalStrategy } from '../backend-output/stack_metadata_output_retrieval_strategy.js';
import {
  ProjectEnvironmentIdentifier,
  StackIdentifier,
} from '@aws-amplify/plugin-types';
import { StackNameMainStackNameResolver } from './stack_name_main_stack_name_resolver.js';
import { ProjectEnvironmentMainStackNameResolver } from './project_environment_main_stack_name_resolver.js';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { DataClientConfigContributor } from './client-config-contributor/data_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './client-config-contributor/storage_client_config_contributor.js';
import { ApiClientConfigContributor } from '@aws-amplify/api-client-config';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  private readonly cfnClient: CloudFormationClient;
  private readonly clientConfigContributors = [
    new AuthClientConfigContributor(),
    new DataClientConfigContributor(),
    new StorageClientConfigContributor(),
    new ApiClientConfigContributor(),
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
  }
  /**
   * Initialize a ClientConfigGenerator given a stack name
   */
  fromStackIdentifier(stackIdentifier: StackIdentifier): ClientConfigGenerator {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new StackNameMainStackNameResolver(stackIdentifier.stackName)
      ),
      this.clientConfigContributors
    );
  }

  /**
   * Initialize a ClientConfigGenerator given a ProjectEnvironmentIdentifier
   */
  fromProjectEnvironmentIdentifier(
    projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ): ClientConfigGenerator {
    return new UnifiedClientConfigGenerator(
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        new ProjectEnvironmentMainStackNameResolver(
          new SSMClient({ credentials: this.credentialProvider }),
          projectEnvironmentIdentifier
        )
      ),
      this.clientConfigContributors
    );
  }
}
