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
  }

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

    const logins: Record<string, string | undefined> = {};
    logins[
      `cognito-idp.${await this.cognitoIdentityClient.config.region()}.amazonaws.com/${simpleAuthUserPoolId}`
    ] = respondToAuthChallengeResponse.AuthenticationResult?.IdToken;
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
}
