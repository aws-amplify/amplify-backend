import {
  ClientConfigGenerator,
  DefaultClientConfigGenerator,
} from './client_config_generator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/primitives';
import {
  PassThroughStackNameResolver,
  ProjectEnvironmentStackNameResolver,
} from './stack_name_resolver.js';
import { SSMClient } from '@aws-sdk/client-ssm';
import { StackMetadataOutputRetrievalStrategy } from './output_retrieval_strategy.js';

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
  fromStackName(stackName: string): ClientConfigGenerator {
    return new DefaultClientConfigGenerator(
      new StackMetadataOutputRetrievalStrategy(
        this.cfnClient,
        new PassThroughStackNameResolver(stackName)
      )
    );
  }

  /**
   * Initialize a ClientConfigGenerator given a ProjectEnvironmentIdentifier
   */
  fromProjectEnvironment(
    projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ): ClientConfigGenerator {
    return new DefaultClientConfigGenerator(
      new StackMetadataOutputRetrievalStrategy(
        this.cfnClient,
        new ProjectEnvironmentStackNameResolver(
          new SSMClient({ credentials: this.credentialProvider }),
          projectEnvironmentIdentifier
        )
      )
    );
  }
}
