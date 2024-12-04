import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { generateClientConfig } from '@aws-amplify/client-config';
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client/core';
import { AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { gql } from 'graphql-tag';
import assert from 'assert';
import { NormalizedCacheObject } from '@apollo/client';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates the data and function test project.
 */
export class DataAccessFromFunctionTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'data-access-from-function';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig
    )
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new DataAccessFromFunctionTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient
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

/**
 * The data and function test project.
 */
class DataAccessFromFunctionTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/data_access_from_function';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient
    );
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);

    const clientConfig = await generateClientConfig(backendId, '1.1');
    if (!clientConfig.data?.url) {
      throw new Error('Data and function project must include data');
    }
    if (!clientConfig.data.api_key) {
      throw new Error('Data and function project must include api_key');
    }

    const httpLink = new HttpLink({ uri: clientConfig.data.url });
    const link = ApolloLink.from([
      createAuthLink({
        url: clientConfig.data.url,
        region: clientConfig.data.aws_region,
        auth: {
          type: AUTH_TYPE.API_KEY,
          apiKey: clientConfig.data.api_key,
        },
      }),
      // see https://github.com/awslabs/aws-mobile-appsync-sdk-js/issues/473#issuecomment-543029072
      httpLink,
    ]);
    const apolloClient = new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });

    await this.assertDataFunctionCallSucceeds(apolloClient);
    await this.assertNoopWithImportCallSucceeds(apolloClient);
  }

  private assertDataFunctionCallSucceeds = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
  ): Promise<void> => {
    // The todoCount query calls the todoCount lambda
    const response = await apolloClient.query<number>({
      query: gql`
        query todoCount {
          todoCount
        }
      `,
      variables: {},
    });

    // Assert the expected lambda call return
    assert.deepEqual(response.data, { todoCount: 0 });
  };

  private assertNoopWithImportCallSucceeds = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
  ): Promise<void> => {
    // The noopImport query calls the noopImport lambda
    const response = await apolloClient.query<number>({
      query: gql`
        query noopImport {
          noopImport
        }
      `,
      variables: {},
    });

    // Assert the expected lambda call return
    assert.deepEqual(response.data, { noopImport: 'STATIC TEST RESPONSE' });
  };
}
