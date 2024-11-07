import { TestProjectBase } from './test_project_base.js';
import fsp from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { AuthResourceCreator } from '../resource-creation/auth_resource_creator.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { IAMClient } from '@aws-sdk/client-iam';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Creates a reference auth project
 */
export class ReferenceAuthTestProjectCreator implements TestProjectCreator {
  readonly name = 'reference-auth';

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
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private readonly cognitoIdentityClient: CognitoIdentityClient = new CognitoIdentityClient(
      e2eToolingClientConfig
    ),
    private readonly iamClient: IAMClient = new IAMClient(
      e2eToolingClientConfig
    )
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new ReferenceAuthTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.cognitoIdentityProviderClient,
      this.cognitoIdentityClient,
      this.iamClient
    );

    await fsp.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );

    // generate resources
    const {
      userPool,
      userPoolClient,
      identityPool,
      authRole,
      unauthRole,
      adminGroup,
    } = await project.setupTestResources();
    // copy generated resource ids into project's auth/resource.ts file
    const authResourceFilePath = `${project.projectAmplifyDirPath}/auth/resource.ts`;
    await fsp.writeFile(
      authResourceFilePath,
      `import { referenceAuth } from '@aws-amplify/backend';
          import { addUserToGroup } from "../data/add-user-to-group/resource.js";
  
          export const auth = referenceAuth({
          identityPoolId: "${identityPool.IdentityPoolId}",
          authRoleArn: "${authRole.Arn}",
          unauthRoleArn: "${unauthRole.Arn}",
          userPoolId: "${userPool.Id}",
          userPoolClientId: "${userPoolClient.ClientId}",
          groups: {
              "ADMINS": '${adminGroup.RoleArn}',
          },
          access: (allow) => [
              allow.resource(addUserToGroup).to(["addUserToGroup"])
          ],
          })`
    );
    return project;
  };
}

/**
 * The minimal test with typescript idioms.
 */
class ReferenceAuthTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/reference-auth';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  authResourceCreator: AuthResourceCreator;

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private cognitoIdentityClient: CognitoIdentityClient,
    iamClient: IAMClient
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient
    );
    this.authResourceCreator = new AuthResourceCreator(
      cognitoIdentityProviderClient,
      cognitoIdentityClient,
      iamClient
    );
  }

  setupTestResources = async () => {
    try {
      const userPool = await this.authResourceCreator.createUserPoolBase({
        PoolName: `RefUserPool`,
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
        AutoVerifiedAttributes: ['email'],
        UserAttributeUpdateSettings: {
          AttributesRequireVerificationBeforeUpdate: ['email'],
        },
        EmailConfiguration: {
          EmailSendingAccount: 'COGNITO_DEFAULT',
        },
        Schema: [
          {
            Name: 'email',
            Required: true,
          },
        ],
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            TemporaryPasswordValidityDays: 7,
          },
        },
        UsernameAttributes: ['email'],
        UsernameConfiguration: {
          CaseSensitive: false,
        },
        MfaConfiguration: 'OFF',
        DeletionProtection: 'INACTIVE',
      });

      const domain = await this.authResourceCreator.createUserPoolDomainBase({
        UserPoolId: userPool.Id,
        Domain: `ref-auth`,
      });

      await this.authResourceCreator.createIdentityProviderBase({
        UserPoolId: userPool.Id,
        ProviderType: 'Facebook',
        ProviderDetails: {
          client_id: 'clientId',
          client_secret: 'clientSecret',
          authorize_scopes: 'openid,email',
          api_version: 'v17.0',
        },
        AttributeMapping: {
          email: 'email',
        },
        ProviderName: 'Facebook',
      });

      await this.authResourceCreator.createIdentityProviderBase({
        UserPoolId: userPool.Id,
        ProviderType: 'Google',
        ProviderDetails: {
          client_id: 'clientId',
          client_secret: 'clientSecret',
          authorize_scopes: 'openid,email',
        },
        AttributeMapping: {
          email: 'email',
        },
        ProviderName: 'Google',
      });

      const userPoolClient =
        await this.authResourceCreator.createUserPoolClientBase({
          ClientName: `ref-auth-client`,
          UserPoolId: userPool.Id,
          ExplicitAuthFlows: [
            'ALLOW_REFRESH_TOKEN_AUTH',
            'ALLOW_USER_SRP_AUTH',
          ],
          AuthSessionValidity: 3,
          RefreshTokenValidity: 30,
          AccessTokenValidity: 60,
          IdTokenValidity: 60,
          TokenValidityUnits: {
            RefreshToken: 'days',
            AccessToken: 'minutes',
            IdToken: 'minutes',
          },
          EnableTokenRevocation: true,
          PreventUserExistenceErrors: 'ENABLED',
          AllowedOAuthFlows: ['code'],
          AllowedOAuthScopes: ['openid', 'phone', 'email'],
          SupportedIdentityProviders: ['COGNITO', 'Facebook', 'Google'],
          CallbackURLs: ['https://callback.com'],
          LogoutURLs: ['https://logout.com'],
          AllowedOAuthFlowsUserPoolClient: true,
          GenerateSecret: false,
          ReadAttributes: [
            'address',
            'birthdate',
            'email',
            'email_verified',
            'family_name',
            'gender',
            'given_name',
            'locale',
            'middle_name',
            'name',
            'nickname',
            'phone_number',
            'phone_number_verified',
            'picture',
            'preferred_username',
            'profile',
            'updated_at',
            'website',
            'zoneinfo',
          ],
          WriteAttributes: [
            'address',
            'birthdate',
            'email',
            'family_name',
            'gender',
            'given_name',
            'locale',
            'middle_name',
            'name',
            'nickname',
            'phone_number',
            'picture',
            'preferred_username',
            'profile',
            'updated_at',
            'website',
            'zoneinfo',
          ],
        });

      const region = await this.cognitoIdentityClient.config.region();
      const identityPool =
        await this.authResourceCreator.createIdentityPoolBase({
          AllowUnauthenticatedIdentities: true,
          IdentityPoolName: `ref-auth-ip`,
          AllowClassicFlow: false,
          CognitoIdentityProviders: [
            {
              ClientId: userPoolClient.ClientId,
              ProviderName: `cognito-idp.${region}.amazonaws.com/${userPool.Id}`,
              ServerSideTokenCheck: false,
            },
          ],
          SupportedLoginProviders: {
            'graph.facebook.com': 'clientId',
            'accounts.google.com': 'clientId',
          },
        });

      const roles = await this.authResourceCreator.setupIdentityPoolRoles(
        userPool.Id!,
        userPoolClient.ClientId!,
        identityPool.IdentityPoolId
      );

      const adminGroup = await this.authResourceCreator.setupUserPoolGroup(
        'ADMINS',
        userPool.Id!,
        identityPool.IdentityPoolId
      );
      return {
        userPool,
        userPoolClient,
        domain,
        identityPool,
        authRole: roles.authRole,
        unauthRole: roles.unauthRole,
        adminGroup,
      };
    } catch (e) {
      await this.authResourceCreator.cleanupResources();
      throw e;
    }
  };

  /**
   * @inheritdoc
   */
  override async tearDown(backendIdentifier: BackendIdentifier) {
    await super.tearDown(backendIdentifier, true);
    await this.authResourceCreator.cleanupResources();
  }
}
