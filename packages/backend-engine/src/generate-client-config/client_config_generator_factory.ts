import {
  ClientConfigGenerator,
  DefaultClientConfigGenerator,
} from './client_config_generator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { SSMClient } from '@aws-sdk/client-ssm';
import { StackMetadataOutputRetrievalStrategy } from './output_retrieval_strategy.js';
import {
  ProjectEnvironmentIdentifier,
  StackIdentifier,
} from '@aws-amplify/backend-types';
import { StackNameBackendIdentificationStrategy } from '../backend-metadata/stack_name_backend_identification_strategy.js';
import { ProjectEnvironmentBackendIdentificationStrategy } from '../backend-metadata/project_environment_backend_identification_strategy.js';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  private readonly cfnClient: CloudFormationClient;
  private readonly ssmClient: SSMClient;
  /**
   * Provide the factory with AWS credentials. These credentials will be used to configure underlying SDK clients for resolving backend output.
   */
  constructor(
    private readonly credentialProvider: AwsCredentialIdentityProvider
  ) {
    this.cfnClient = new CloudFormationClient({
      credentials: credentialProvider,
    });
    this.ssmClient = new SSMClient({ credentials: credentialProvider });
  }
  /**
   * Initialize a ClientConfigGenerator given a stack name
   */
  fromStackIdentifier(stackIdentifier: StackIdentifier): ClientConfigGenerator {
    return new DefaultClientConfigGenerator(
      new StackMetadataOutputRetrievalStrategy(
        this.cfnClient,
        this.ssmClient,
        new StackNameBackendIdentificationStrategy(stackIdentifier.stackName)
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
        this.ssmClient,
        new ProjectEnvironmentBackendIdentificationStrategy(
          projectEnvironmentIdentifier
        )
      )
    );
  }
}
