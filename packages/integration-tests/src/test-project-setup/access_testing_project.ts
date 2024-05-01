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
import { shortUuid } from '../short_uuid.js';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetIdCommandOutput,
  GetOpenIdTokenCommand,
  GetOpenIdTokenCommandOutput,
} from '@aws-sdk/client-cognito-identity';
import {
  AssumeRoleCommand,
  AssumeRoleCommandOutput,
  AssumeRoleWithWebIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import assert from 'assert';
import {
  ClientConfigVersionTemplateType,
  generateClientConfig,
} from '@aws-amplify/client-config';
import { AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client/core';
import { NormalizedCacheObject } from '@apollo/client';
import crypto from 'node:crypto';
import { gql } from 'graphql-tag';
import { IamCredentials } from '../types.js';
import { AmplifyAuthCredentialsFactory } from '../amplify_auth_credentials_factory.js';

// TODO: this is a work around
// it seems like as of amplify v6 , some of the code only runs in the browser ...
// see https://github.com/aws-amplify/amplify-js/issues/12751
// @ts-expect-error altering typing for global to make compiler happy is not worth the effort assuming this is temporary workaround
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
    private readonly stsClient: STSClient
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new AccessTestingProjectTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.cognitoIdentityClient,
      this.cognitoIdentityProviderClient,
      this.stsClient
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
  openIdToken: string;
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
    private readonly stsClient: STSClient
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);
    const clientConfig = await generateClientConfig(backendId, '1');
    await this.assertDifferentCognitoInstanceCannotAssumeAmplifyRoles(
      clientConfig
    );
    await this.assertAmplifyAuthAccessToData(clientConfig);
    await this.assertGenericIamRolesAccessToData(clientConfig);
  }

  /**
   * This test asserts that generic IAM roles have proper access to data API.
   * I.e. roles not created by auth construct.
   */
  private assertGenericIamRolesAccessToData = async (
    clientConfig: ClientConfigVersionTemplateType<'1'>
  ) => {
    if (!clientConfig.custom) {
      throw new Error('Client config is missing custom section');
    }

    const roleWithAccessToDataArn = clientConfig.custom
      .roleWithAccessToDataArn as string;
    const roleWithAccessToDataCredentials = await this.assumeRole(
      roleWithAccessToDataArn
    );
    const appSyncClientForRoleWithAccessToData = this.createAppSyncClient(
      clientConfig,
      roleWithAccessToDataCredentials
    );
    // evaluates successfully
    await appSyncClientForRoleWithAccessToData.query({
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
    // evaluates successfully
    await appSyncClientForRoleWithAccessToData.query({
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

    const roleWithoutAccessToDataArn = clientConfig.custom
      .roleWithoutAccessToDataArn as string;
    const roleWithoutAccessToDataCredentials = await this.assumeRole(
      roleWithoutAccessToDataArn
    );
    const appSyncClientForRoleWithoutAccessToData = this.createAppSyncClient(
      clientConfig,
      roleWithoutAccessToDataCredentials
    );
    await assert.rejects(
      () =>
        appSyncClientForRoleWithoutAccessToData.query({
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
          'Response not successful: Received status code 401'
        );
        return true;
      }
    );

    await assert.rejects(
      () =>
        appSyncClientForRoleWithoutAccessToData.query({
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
          'Response not successful: Received status code 401'
        );
        return true;
      }
    );
  };

  /**
   * This asserts that authenticated and unauthenticated roles have relevant access to data API.
   */
  private assertAmplifyAuthAccessToData = async (
    clientConfig: ClientConfigVersionTemplateType<'1'>
  ): Promise<void> => {
    if (!clientConfig.auth) {
      throw new Error('Client config is missing auth section');
    }
    const authenticatedUserCredentials =
      await new AmplifyAuthCredentialsFactory(
        this.cognitoIdentityProviderClient,
        clientConfig.auth
      ).getNewAuthenticatedUserCredentials();
    const appSyncClientForAuthenticatedUser = this.createAppSyncClient(
      clientConfig,
      authenticatedUserCredentials
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
          'Not Authorized to access listPublicTodos on type Query'
        );
        return true;
      }
    );

    const guestAccessCredentials = await new AmplifyAuthCredentialsFactory(
      this.cognitoIdentityProviderClient,
      clientConfig.auth
    ).getGuestAccessCredentials();
    const appSyncClientForGuestUser = this.createAppSyncClient(
      clientConfig,
      guestAccessCredentials
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
          'Response not successful: Received status code 401'
        );
        return true;
      }
    );
  };

  /**
   * This asserts that idToken obtained from Cognito instance other than
   * created by auth construct cannot be used to assume Amplify authorized and
   * unauthorized roles. I.e. it tests trust policy.
   */
  private assertDifferentCognitoInstanceCannotAssumeAmplifyRoles = async (
    clientConfig: ClientConfigVersionTemplateType<'1'>
  ): Promise<void> => {
    const simpleAuthUser = await this.createAuthenticatedSimpleAuthCognitoUser(
      clientConfig
    );
    if (!clientConfig.custom) {
      throw new Error('Client config is missing custom section');
    }
    const authRoleArn = clientConfig.custom.authRoleArn as string;
    const unAuthRoleArn = clientConfig.custom.unAuthRoleArn as string;

    await assert.rejects(
      () =>
        this.stsClient.send(
          new AssumeRoleWithWebIdentityCommand({
            RoleArn: authRoleArn,
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
            RoleArn: unAuthRoleArn,
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

  private createAuthenticatedSimpleAuthCognitoUser = async (
    clientConfig: ClientConfigVersionTemplateType<'1'>
  ): Promise<SimpleAuthCognitoUser> => {
    if (!clientConfig.custom) {
      throw new Error('Client config is missing custom section');
    }
    const simpleAuthUserPoolId = clientConfig.custom
      .simpleAuthUserPoolId as string;
    const simpleAuthUserPoolClientId = clientConfig.custom
      .simpleAuthUserPoolClientId as string;
    const simpleAuthIdentityPoolId = clientConfig.custom
      .simpleAuthIdentityPoolId as string;
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
      openIdToken: getOpenIdTokenResponse.Token,
    };
  };

  private createAppSyncClient = (
    clientConfig: ClientConfigVersionTemplateType<'1'>,
    credentials: IamCredentials
  ): ApolloClient<NormalizedCacheObject> => {
    if (!clientConfig.data?.url) {
      throw new Error('Appsync API URL is undefined');
    }
    if (!clientConfig.data?.aws_region) {
      throw new Error('Appsync API region is undefined');
    }

    const httpLink = new HttpLink({ uri: clientConfig.data.url });
    const link = ApolloLink.from([
      createAuthLink({
        url: clientConfig.data.url,
        region: clientConfig.data.aws_region,
        auth: {
          type: AUTH_TYPE.AWS_IAM,
          credentials,
        },
      }),
      // see https://github.com/awslabs/aws-mobile-appsync-sdk-js/issues/473#issuecomment-543029072
      httpLink,
    ]);
    return new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });
  };

  private assumeRole = async (roleArn: string): Promise<IamCredentials> => {
    const assumeRoleResponse: AssumeRoleCommandOutput =
      await this.stsClient.send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: shortUuid(),
        })
      );

    if (
      !assumeRoleResponse.Credentials?.AccessKeyId ||
      !assumeRoleResponse.Credentials?.SecretAccessKey ||
      !assumeRoleResponse.Credentials?.SessionToken
    ) {
      throw new Error('Invalid IAM role credentials.');
    }

    return {
      accessKeyId: assumeRoleResponse.Credentials?.AccessKeyId,
      secretAccessKey: assumeRoleResponse.Credentials?.SecretAccessKey,
      sessionToken: assumeRoleResponse.Credentials?.SessionToken,
    };
  };
}
