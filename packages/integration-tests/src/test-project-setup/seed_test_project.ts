import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase } from './test_project_base.js';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { /*GetRoleCommand,*/ IAMClient } from '@aws-sdk/client-iam';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import fs from 'fs/promises';
import assert from 'node:assert';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ampxCli } from '../process-controller/process_controller.js';
import { generateClientConfig } from '@aws-amplify/client-config';
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  gql,
} from '@apollo/client';
import { AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { AmplifyAuthCredentialsFactory } from '../amplify_auth_credentials_factory.js';

/**
 * Creates test project for seed
 */
export class SeedTestProjectCreator implements TestProjectCreator {
  readonly name = 'seed';

  /**
   * Creates project creator
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private readonly iamClient: IAMClient = new IAMClient(
      e2eToolingClientConfig
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder()
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new SeedTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.cognitoIdentityProviderClient,
      this.iamClient,
      this.resourceFinder
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );
    return project;
  };
}

class SeedTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/seed';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly iamClient: IAMClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient
    );
  }

  override async deploy(
    backendIdentifier: BackendIdentifier,
    environment?: Record<string, string>
  ) {
    await super.deploy(backendIdentifier, environment);
    await ampxCli(['sandbox', 'seed', 'generate-policy'], this.projectDirPath, {
      env: environment,
    }).run();
    //await this.attachToRole(backendIdentifier);
    await ampxCli(['sandbox', 'seed'], this.projectDirPath, {
      env: environment,
    }).run();
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);
    const clientConfig = await generateClientConfig(backendId, '1.3');

    const cognitoId = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Cognito::UserPool',
      () => true
    );

    const users = await this.cognitoIdentityProviderClient.send(
      new ListUsersCommand({ UserPoolId: cognitoId[0] })
    );

    assert.ok(users.Users);
    assert.strictEqual(users.Users[0].Username, 'test@testing.com');

    if (!clientConfig.auth) {
      throw new Error('Client config missing auth section');
    }

    if (!clientConfig.data) {
      throw new Error('Client config missing data section');
    }

    const authenticatedUserCredentials =
      await new AmplifyAuthCredentialsFactory(
        this.cognitoIdentityProviderClient,
        clientConfig.auth
      ).getNewAuthenticatedUserCredentials();

    const httpLink = new HttpLink({ uri: clientConfig.data.url });
    const link = ApolloLink.from([
      createAuthLink({
        url: clientConfig.data?.url,
        region: clientConfig.data?.aws_region,
        auth: {
          type: AUTH_TYPE.AWS_IAM,
          credentials: authenticatedUserCredentials.iamCredentials,
        },
      }),
      httpLink,
    ]);

    const apolloClient = new ApolloClient({
      link: link,
      cache: new InMemoryCache(),
    });

    const content = await apolloClient.query({
      query: gql`
        query TestQuery {
          listTodos {
            items {
              id
              content
            }
          }
        }
      `,
    });

    assert.strictEqual(
      content.data.content,
      'Todo list item for test@testing.com'
    );
  }
  /*
  async attachToRole(backendId: BackendIdentifier) {
    // somehow need to get the deployment role to add the policy to it
    const role = (await this.iamClient.send(new GetRoleCommand({ RoleName: 'SeedRole'})));
  }*/
}
