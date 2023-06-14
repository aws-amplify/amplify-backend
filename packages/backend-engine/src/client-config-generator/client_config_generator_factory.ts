import {
  ClientConfigGenerator,
  DefaultClientConfigGenerator,
} from './client_config_generator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { SSMClient } from '@aws-sdk/client-ssm';
import { StackMetadataOutputRetrievalStrategy } from '../backend-output/stack_metadata_output_retrieval_strategy.js';
import {
  ProjectEnvironmentIdentifier,
  StackIdentifier,
} from '@aws-amplify/plugin-types';
import { StackNameMainStackNameResolver } from './stack_name_main_stack_name_resolver.js';
import { ProjectEnvironmentMainStackNameResolver } from './project_environment_main_stack_name_resolver.js';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  private readonly cfnClient: CloudFormationClient;
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
    return new DefaultClientConfigGenerator(
      new StackMetadataOutputRetrievalStrategy(
        this.cfnClient,
        new StackNameMainStackNameResolver(stackIdentifier.stackName)
      )
    );
  }

  /**
   * Initialize a ClientConfigGenerator given a ProjectEnvironmentIdentifier
   */
  fromProjectEnvironmentIdentifier(
    projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ): ClientConfigGenerator {
    return new DefaultClientConfigGenerator(
      new StackMetadataOutputRetrievalStrategy(
        this.cfnClient,
        new ProjectEnvironmentMainStackNameResolver(
          new SSMClient({ credentials: this.credentialProvider }),
          projectEnvironmentIdentifier
        )
      )
    );
  }
}
