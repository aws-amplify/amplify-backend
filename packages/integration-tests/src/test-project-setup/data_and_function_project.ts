import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { generateClientConfig } from '@aws-amplify/client-config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { SemVer } from 'semver';
import crypto from 'node:crypto';
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

// TODO: this is a work around
// it seems like as of amplify v6 , some of the code only runs in the browser ...
// see https://github.com/aws-amplify/amplify-js/issues/12751
if (process.versions.node) {
  // node >= 20 now exposes crypto by default. This workaround is not needed: https://github.com/nodejs/node/pull/42083
  if (new SemVer(process.versions.node).major < 20) {
    // @ts-expect-error altering typing for global to make compiler happy is not worth the effort assuming this is temporary workaround
    globalThis.crypto = crypto;
  }
}

/**
 * Creates the data and function test project.
 */
export class DataAndFunctionTestProjectCreator implements TestProjectCreator {
  readonly name = 'data-and-function';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig
    ),
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder()
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new DataAndFunctionTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.lambdaClient,
      this.cognitoIdentityProviderClient,
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

/**
 * The data and function test project.
 */
class DataAndFunctionTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/data-and-function';

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
    amplifyClient: AmplifyClient,
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder()
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

    // const dataUrl = clientConfig.data?.url;

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
  }

  private assertDataFunctionCallSucceeds = async (
    apolloClient: ApolloClient<NormalizedCacheObject>
  ): Promise<void> => {
    const response = await apolloClient.query<number>({
      query: gql`
        query todoCount {
          todoCount
        }
      `,
      variables: {},
    });

    assert.equal(response.data, 0);
  };
}
