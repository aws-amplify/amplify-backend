import { TestProjectBase } from './test_project_base.js';
import fsp from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  AuthFactorType,
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import assert from 'node:assert';

/**
 * Creates passwordless authentication test projects with different configurations
 */
export class PasswordlessAuthTestProjectCreator implements TestProjectCreator {
  readonly name = 'passwordless-auth';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
    private readonly cognitoClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig,
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder(),
  ) {}

  /**
   * Creates a test project with email OTP enabled
   */
  createEmailOtpProject = async (
    e2eProjectDir: string,
  ): Promise<TestProjectBase> => {
    return this.createProjectWithConfig(
      e2eProjectDir,
      'email-otp',
      { email: { otpLogin: true } },
      ['EMAIL_OTP' as AuthFactorType],
    );
  };

  /**
   * Creates a test project with SMS OTP enabled
   */
  createSmsOtpProject = async (
    e2eProjectDir: string,
  ): Promise<TestProjectBase> => {
    return this.createProjectWithConfig(
      e2eProjectDir,
      'sms-otp',
      { phone: { otpLogin: true } },
      ['SMS_OTP' as AuthFactorType],
    );
  };

  /**
   * Creates a test project with WebAuthn enabled
   */
  createWebAuthnProject = async (
    e2eProjectDir: string,
  ): Promise<TestProjectBase> => {
    return this.createProjectWithConfig(
      e2eProjectDir,
      'webauthn',
      { email: true, webAuthn: true },
      ['WEB_AUTHN' as AuthFactorType],
    );
  };

  /**
   * Creates a test project with all passwordless factors enabled
   */
  createCombinedFactorsProject = async (
    e2eProjectDir: string,
  ): Promise<TestProjectBase> => {
    return this.createProjectWithConfig(
      e2eProjectDir,
      'combined-factors',
      {
        email: { otpLogin: true },
        phone: { otpLogin: true },
        webAuthn: true,
      },
      [
        'EMAIL_OTP' as AuthFactorType,
        'SMS_OTP' as AuthFactorType,
        'WEB_AUTHN' as AuthFactorType,
      ],
    );
  };

  /**
   * Default createProject implementation (creates email OTP project)
   */
  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    return this.createEmailOtpProject(e2eProjectDir);
  };

  /**
   * Creates a test project with the specified passwordless configuration
   */
  private createProjectWithConfig = async (
    e2eProjectDir: string,
    projectSuffix: string,
    loginWithConfig: Record<string, unknown>,
    expectedAuthFactors: AuthFactorType[],
  ): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(
        `${this.name}-${projectSuffix}`,
        e2eProjectDir,
      );

    const project = new PasswordlessAuthTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.cognitoClient,
      this.resourceFinder,
      expectedAuthFactors,
    );

    await fsp.mkdir(projectAmplifyDir, { recursive: true });
    await fsp.mkdir(`${projectAmplifyDir}/auth`, { recursive: true });

    const loginWithStr = JSON.stringify(loginWithConfig, null, 2)
      .split('\n')
      .map((line, index) => (index === 0 ? line : `    ${line}`))
      .join('\n');

    const authResourceContent = `import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: ${loginWithStr}
});
`;

    await fsp.writeFile(
      `${projectAmplifyDir}/auth/resource.ts`,
      authResourceContent,
    );

    const backendContent = `import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';

defineBackend({
  auth
});
`;

    await fsp.writeFile(`${projectAmplifyDir}/backend.ts`, backendContent);

    return project;
  };
}

/**
 * Passwordless authentication test project
 */
class PasswordlessAuthTestProject extends TestProjectBase {
  readonly sourceProjectAmplifyDirURL: URL = new URL(
    '../test-projects/passwordless-auth/',
    import.meta.url,
  );

  private expectedAuthFactors: AuthFactorType[] = [];

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly cognitoClient: CognitoIdentityProviderClient,
    private readonly resourceFinder: DeployedResourcesFinder,
    expectedAuthFactors: AuthFactorType[],
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
    this.expectedAuthFactors = expectedAuthFactors;
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    await super.assertPostDeployment(backendId);

    const userPools = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Cognito::UserPool',
    );
    assert.strictEqual(userPools.length, 1, 'Expected exactly one User Pool');

    const userPoolId = userPools[0];
    assert.ok(userPoolId, 'User Pool ID should exist');

    const userPoolResponse = await this.cognitoClient.send(
      new DescribeUserPoolCommand({ UserPoolId: userPoolId }),
    );

    const userPool = userPoolResponse.UserPool;
    assert.ok(userPool, 'User Pool should exist');

    const signInPolicy = userPool.Policies?.SignInPolicy;
    assert.ok(signInPolicy, 'SignInPolicy should exist');
    assert.ok(
      signInPolicy.AllowedFirstAuthFactors,
      'AllowedFirstAuthFactors should exist',
    );

    for (const factor of this.expectedAuthFactors) {
      assert.ok(
        signInPolicy.AllowedFirstAuthFactors.includes(factor),
        `AllowedFirstAuthFactors should include ${factor}`,
      );
    }

    // PASSWORD should always be included
    assert.ok(
      signInPolicy.AllowedFirstAuthFactors.includes(
        'PASSWORD' as AuthFactorType,
      ),
      'AllowedFirstAuthFactors should always include PASSWORD',
    );

    const userPoolClients = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Cognito::UserPoolClient',
    );
    assert.strictEqual(
      userPoolClients.length,
      1,
      'Expected exactly one User Pool Client',
    );

    const userPoolClientId = userPoolClients[0];
    assert.ok(userPoolClientId, 'User Pool Client ID should exist');

    const clientResponse = await this.cognitoClient.send(
      new DescribeUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
      }),
    );

    const client = clientResponse.UserPoolClient;
    assert.ok(client, 'User Pool Client should exist');
    assert.ok(client.ExplicitAuthFlows, 'ExplicitAuthFlows should exist');
    assert.ok(
      client.ExplicitAuthFlows.includes('ALLOW_USER_AUTH'),
      'ExplicitAuthFlows should include ALLOW_USER_AUTH',
    );
  }
}
