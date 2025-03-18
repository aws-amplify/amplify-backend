import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase } from './test_project_base.js';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import fsp from 'fs/promises';
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
} from '@apollo/client/core';
import { AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { AmplifyAuthCredentialsFactory } from '../amplify_auth_credentials_factory.js';
import { execa, execaSync } from 'execa';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { SemVer } from 'semver';
import crypto from 'node:crypto';

// TODO: this is a work around - in theory this should be fixed
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
 * Creates test project for seed
 */
export class SeedTestProjectCreator implements TestProjectCreator {
  readonly name = 'seed';

  /**
   * Creates project creator
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig,
    ),
    private readonly stsClient: STSClient = new STSClient(
      e2eToolingClientConfig,
    ),
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
      this.stsClient,
    );
    await fsp.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      },
    );
    return project;
  };
}

class SeedTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/seed-test-project';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url,
  );

  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly stsClient: STSClient,
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
  }

  override async deploy(
    backendIdentifier: BackendIdentifier,
    environment?: Record<string, string>,
  ) {
    await super.deploy(backendIdentifier, environment);

    const command = execaSync('npx', ['which', 'ampx'], {
      cwd: this.projectDirPath,
    }).stdout.trim();
    const seedPolicyProcess = await execa(
      command,
      ['sandbox', 'seed', 'generate-policy'],
      {
        cwd: this.projectDirPath,
        env: environment,
      },
    );

    const startingInd = seedPolicyProcess.stdout.indexOf('{');
    const cleanedPolicyString = seedPolicyProcess.stdout.slice(startingInd);

    const clientConfig = await generateClientConfig(backendIdentifier, '1.3');
    if (!clientConfig.custom) {
      throw new Error('Client config missing custom section');
    }
    const seedRoleArn = clientConfig.custom.seedRoleArn as string;

    const seedCredentials = await this.stsClient.send(
      new AssumeRoleCommand({
        RoleArn: seedRoleArn,
        RoleSessionName: `seedSession`,
        Policy: cleanedPolicyString,
        PolicyArns: [
          {
            arn: 'arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess',
          },
        ],
      }),
    );

    assert.ok(seedCredentials.Credentials);
    assert.ok(seedCredentials.Credentials.AccessKeyId);
    assert.ok(seedCredentials.Credentials.SessionToken);
    assert.ok(seedCredentials.Credentials.SecretAccessKey);

    await ampxCli(['sandbox', 'seed'], this.projectDirPath, {
      env: {
        AWS_ACCESS_KEY_ID: seedCredentials.Credentials!.AccessKeyId,
        AWS_SECRET_ACCESS_KEY: seedCredentials.Credentials!.SecretAccessKey,
        AWS_SESSION_TOKEN: seedCredentials.Credentials!.SessionToken,
        ...environment,
      },
    }).run();
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    await super.assertPostDeployment(backendId);
    const testUsername = 'testUser@testing.com';
    const clientConfig = await generateClientConfig(backendId, '1.3');

    if (!clientConfig.auth) {
      throw new Error('Client config missing auth section');
    }

    if (!clientConfig.data) {
      throw new Error('Client config missing data section');
    }

    const authenticatedUserCredentials =
      await new AmplifyAuthCredentialsFactory(
        this.cognitoIdentityProviderClient,
        clientConfig.auth,
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
      content.data.listTodos.items[0].content,
      `Todo list item for ${testUsername}`,
    );
  }
}
