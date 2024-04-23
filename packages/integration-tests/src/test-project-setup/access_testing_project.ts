import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandOutput,
  RespondToAuthChallengeCommand,
  RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { shortUuid } from '../short_uuid.js';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetIdCommandOutput,
  GetOpenIdTokenCommand,
  GetOpenIdTokenCommandOutput,
} from '@aws-sdk/client-cognito-identity';
import {
  AssumeRoleWithWebIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import {
  GetRoleCommand,
  GetRoleCommandOutput,
  IAMClient,
} from '@aws-sdk/client-iam';
import assert from 'assert';
import {
  ClientConfigVersionTemplateType,
  generateClientConfig,
} from '@aws-amplify/client-config';
import { Amplify } from 'aws-amplify';
import * as auth from 'aws-amplify/auth';
import { AUTH_TYPE, AWSAppSyncClient } from 'aws-appsync';
import crypto from 'node:crypto';
import { gql } from 'graphql-tag';

// FIXME: this is a hack to work around https://github.com/aws-amplify/amplify-js/issues/12751
// it seems like as of amplify v6 , some of the code only runs in the browser ...
// @ts-expect-error
globalThis.crypto = crypto;

/**
 * Creates access testing projects with typescript idioms.
 */
export class AccessTestingProjectTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'access-testing';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient,
    private readonly cognitoIdentityClient: CognitoIdentityClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly iamClient: IAMClient,
    private readonly stsClient: STSClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    // const { projectName, projectRoot, projectAmplifyDir } =
    //   await createEmptyAmplifyProject(this.name, e2eProjectDir);
    const projectName = 'test-project-access-testing-e353b842e670';
    const projectRoot =
      '/Users/sobkamil/git/samsara-cli/packages/integration-tests/src/e2e-tests/access-testingXbk9yo';
    const projectAmplifyDir =
      '/Users/sobkamil/git/samsara-cli/packages/integration-tests/src/e2e-tests/access-testingXbk9yo/amplify';

    const project = new AccessTestingProjectTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.cognitoIdentityClient,
      this.cognitoIdentityProviderClient,
      this.iamClient,
      this.stsClient,
      this.resourceFinder
    );
    await fs.cp(
      project.sourceProjectAmplifyDirPath,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );
    return project;
  };
}

type SimpleAuthCognitoUser = {
  username: string;
  password: string;
  openIdToken: string;
};

type IamCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

type AmplifyAuthCognitoUser = {
  username: string;
  password: string;
  credentials: IamCredentials;
};

type AmplifyAuthRoles = {
  authRoleArn: string;
  unAuthRoleArn: string;
};

/**
 * The access testing project.
 */
class AccessTestingProjectTestProject extends TestProjectBase {
  // Note that this is pointing to the non-compiled project directory
  // This allows us to test that we are able to deploy js, cjs, ts, etc without compiling with tsc first
  readonly sourceProjectDirPath =
    '../../src/test-projects/access-testing-project';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirPath: URL = new URL(
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
    private readonly cognitoIdentityClient: CognitoIdentityClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly iamClient: IAMClient,
    private readonly stsClient: STSClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);
    await this.assertDifferentCognitoInstanceCannotAssumeAmplifyRoles(
      backendId
    );
    await this.assertAmplifyAuthAccessToData(backendId);
  }

  private assertAmplifyAuthAccessToData = async (
    backendId: BackendIdentifier
  ): Promise<void> => {
    const clientConfig = await generateClientConfig(backendId, '1');

    const authenticatedUser =
      await this.createAuthenticatedAmplifyAuthCognitoUser(clientConfig);
    const appSyncClientForAuthenticatedUser = this.createAppSyncClient(
      clientConfig,
      authenticatedUser.credentials
    );

    // evaluates successfully
    await appSyncClientForAuthenticatedUser.query({
      query: gql`
        query TestQuery {
          listPrivateTodos {
            items {
              id
              content
            }
          }
        }
      `,
    });

    await assert.rejects(
      () =>
        appSyncClientForAuthenticatedUser.query({
          query: gql`
            query TestQuery {
              listPublicTodos {
                items {
                  id
                  content
                }
              }
            }
          `,
        }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          'GraphQL error: Not Authorized to access listPublicTodos on type Query'
        );
        return true;
      }
    );

    const guestUserCredentials =
      await this.getGuestAccessAmplifyAuthCredentials(clientConfig);
    const appSyncClientForGuestUser = this.createAppSyncClient(
      clientConfig,
      guestUserCredentials
    );

    // evaluates successfully
    await appSyncClientForGuestUser.query({
      query: gql`
        query TestQuery {
          listPublicTodos {
            items {
              id
              content
            }
          }
        }
      `,
    });

    await assert.rejects(
      () =>
        appSyncClientForGuestUser.query({
          query: gql`
            query TestQuery {
              listPrivateTodos {
                items {
                  id
                  content
                }
              }
            }
          `,
        }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          'Network error: Response not successful: Received status code 401'
        );
        return true;
      }
    );
  };

  private assertDifferentCognitoInstanceCannotAssumeAmplifyRoles = async (
    backendId: BackendIdentifier
  ): Promise<void> => {
    const simpleAuthUser = await this.createAuthenticatedSimpleAuthCognitoUser(
      backendId
    );
    const amplifyAuthRoles = await this.getAmplifyAuthRoles(backendId);

    await assert.rejects(
      () =>
        this.stsClient.send(
          new AssumeRoleWithWebIdentityCommand({
            RoleArn: amplifyAuthRoles.authRoleArn,
            RoleSessionName: shortUuid(),
            WebIdentityToken: simpleAuthUser.openIdToken,
          })
        ),
      (err: Error) => {
        assert.strictEqual(
          err.message,
          'Not authorized to perform sts:AssumeRoleWithWebIdentity'
        );
        return true;
      }
    );

    await assert.rejects(
      () =>
        this.stsClient.send(
          new AssumeRoleWithWebIdentityCommand({
            RoleArn: amplifyAuthRoles.unAuthRoleArn,
            RoleSessionName: shortUuid(),
            WebIdentityToken: simpleAuthUser.openIdToken,
          })
        ),
      (err: Error) => {
        assert.strictEqual(
          err.message,
          'Not authorized to perform sts:AssumeRoleWithWebIdentity'
        );
        return true;
      }
    );
  };

  private getAmplifyAuthRoles = async (
    backendId: BackendIdentifier
  ): Promise<AmplifyAuthRoles> => {
    const [authRoleName] = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::IAM::Role',
      undefined,
      (name) => name.includes('amplifyAuthauthenticatedUserRole')
    );

    const getAuthRoleResponse: GetRoleCommandOutput = await this.iamClient.send(
      new GetRoleCommand({
        RoleName: authRoleName,
      })
    );

    if (!getAuthRoleResponse.Role?.Arn) {
      throw new Error('Missing auth role arn');
    }

    const [unAuthRoleName] = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::IAM::Role',
      undefined,
      (name) => name.includes('amplifyAuthunauthenticatedUserRole')
    );

    const getUnAuthRoleResponse: GetRoleCommandOutput =
      await this.iamClient.send(
        new GetRoleCommand({
          RoleName: unAuthRoleName,
        })
      );

    if (!getUnAuthRoleResponse.Role?.Arn) {
      throw new Error('Missing un auth role arn');
    }

    return {
      authRoleArn: getAuthRoleResponse.Role.Arn,
      unAuthRoleArn: getUnAuthRoleResponse.Role.Arn,
    };
  };

  private createAuthenticatedAmplifyAuthCognitoUser = async (
    clientConfig: ClientConfigVersionTemplateType<'1'>
  ): Promise<AmplifyAuthCognitoUser> => {
    const username = `amplify-backend-${shortUuid()}@amazon.com`;
    const temporaryPassword = `Test1@Temp${shortUuid()}`;
    const password = `Test1@${shortUuid()}`;
    await this.cognitoIdentityProviderClient.send(
      new AdminCreateUserCommand({
        Username: username,
        TemporaryPassword: temporaryPassword,
        UserPoolId: clientConfig.auth?.user_pool_id,
        MessageAction: 'SUPPRESS',
      })
    );

    if (!clientConfig.auth?.user_pool_id) {
      throw new Error('Client config must have user pool id.');
    }

    if (!clientConfig.auth?.identity_pool_id) {
      throw new Error('Client config must have identity pool id.');
    }

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: clientConfig.auth?.user_pool_id,
          userPoolClientId: clientConfig.auth?.user_pool_client_id,
          identityPoolId: clientConfig.auth?.identity_pool_id,
          allowGuestAccess:
            clientConfig.auth.unauthenticated_identities_enabled,
        },
      },
    });

    const signInResult = await auth.signIn({
      username,
      password: temporaryPassword,
    });

    assert.strictEqual(
      signInResult.nextStep.signInStep,
      'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
    );

    await auth.confirmSignIn({
      challengeResponse: password,
    });

    const authSession = await auth.fetchAuthSession();
    authSession.credentials;

    if (!authSession.credentials) {
      throw new Error('No credentials in auth session');
    }

    return {
      username,
      password,
      credentials: authSession.credentials,
    };
  };

  private createAuthenticatedSimpleAuthCognitoUser = async (
    backendId: BackendIdentifier
  ): Promise<SimpleAuthCognitoUser> => {
    const [simpleAuthUserPoolId] =
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Cognito::UserPool',
        undefined,
        (name) => name.includes('SimpleAuthUserPool')
      );
    const [simpleAuthUserPoolClientId] =
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Cognito::UserPoolClient',
        undefined,
        (name) => name.includes('SimpleAuthUserPoolClient')
      );

    const [simpleAuthIdentityPoolId] =
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Cognito::IdentityPool',
        undefined,
        (name) => name.includes('SimpleAuthIdentityPool')
      );

    const username = `amplify-backend-${shortUuid()}@amazon.com`;
    const temporaryPassword = `Test1@Temp${shortUuid()}`;
    const password = `Test1@${shortUuid()}`;
    await this.cognitoIdentityProviderClient.send(
      new AdminCreateUserCommand({
        Username: username,
        TemporaryPassword: temporaryPassword,
        UserPoolId: simpleAuthUserPoolId,
        MessageAction: 'SUPPRESS',
      })
    );

    const initiateAuthResponse: InitiateAuthCommandOutput =
      await this.cognitoIdentityProviderClient.send(
        new InitiateAuthCommand({
          ClientId: simpleAuthUserPoolClientId,
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: username,
            PASSWORD: temporaryPassword,
          },
        })
      );

    const respondToAuthChallengeResponse: RespondToAuthChallengeCommandOutput =
      await this.cognitoIdentityProviderClient.send(
        new RespondToAuthChallengeCommand({
          ClientId: simpleAuthUserPoolClientId,
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          Session: initiateAuthResponse.Session,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: password,
          },
        })
      );

    const logins: Record<string, string> = {};
    if (respondToAuthChallengeResponse.AuthenticationResult?.IdToken) {
      logins[
        `cognito-idp.${await this.cognitoIdentityClient.config.region()}.amazonaws.com/${simpleAuthUserPoolId}`
      ] = respondToAuthChallengeResponse.AuthenticationResult.IdToken;
    }
    const getIdResponse: GetIdCommandOutput =
      await this.cognitoIdentityClient.send(
        new GetIdCommand({
          IdentityPoolId: simpleAuthIdentityPoolId,
          Logins: logins,
        })
      );

    const getOpenIdTokenResponse: GetOpenIdTokenCommandOutput =
      await this.cognitoIdentityClient.send(
        new GetOpenIdTokenCommand({
          IdentityId: getIdResponse.IdentityId,
          Logins: logins,
        })
      );

    if (!getOpenIdTokenResponse.Token) {
      throw new Error('Missing OpenId Token');
    }

    return {
      username,
      password,
      openIdToken: getOpenIdTokenResponse.Token,
    };
  };

  private getGuestAccessAmplifyAuthCredentials = async (
    clientConfig: ClientConfigVersionTemplateType<'1'>
  ): Promise<IamCredentials> => {
    if (!clientConfig.auth?.user_pool_id) {
      throw new Error('Client config must have user pool id.');
    }

    if (!clientConfig.auth?.identity_pool_id) {
      throw new Error('Client config must have identity pool id.');
    }

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: clientConfig.auth?.user_pool_id,
          userPoolClientId: clientConfig.auth?.user_pool_client_id,
          identityPoolId: clientConfig.auth?.identity_pool_id,
          allowGuestAccess:
            clientConfig.auth.unauthenticated_identities_enabled,
        },
      },
    });

    await auth.signOut();

    const authSession = await auth.fetchAuthSession();
    authSession.credentials;

    if (!authSession.credentials) {
      throw new Error('No credentials in auth session');
    }

    return authSession.credentials;
  };

  private createAppSyncClient = (
    clientConfig: ClientConfigVersionTemplateType<'1'>,
    credentials: IamCredentials
  ): AWSAppSyncClient<any> => {
    if (!clientConfig.data?.url) {
      throw new Error('Appsync API URL is undefined');
    }
    if (!clientConfig.data?.aws_region) {
      throw new Error('Appsync API region is undefined');
    }
    return new AWSAppSyncClient({
      url: clientConfig.data?.url,
      region: clientConfig.data?.aws_region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials,
      },
      disableOffline: true,
    });
  };
}
