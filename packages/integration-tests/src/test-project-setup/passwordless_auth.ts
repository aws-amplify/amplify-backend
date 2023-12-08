import fs from 'fs/promises';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase } from './test_project_base.js';
import { TestProjectCreator } from './test_project_creator.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import assert from 'node:assert';
import {
  SignInWithMagicLink,
  SignInWithMagicLinkWithUnverifiedAttribute,
} from './passwordless_auth_tests.js';
import { getUsername } from './passwordless_auth_resources.js';

/**
 * Creates test projects with passwordless auth.
 */
export class PasswordlessAuthTestProjectCreator implements TestProjectCreator {
  readonly name = 'passwordless-auth';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new PasswordlessAuthTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.cognitoIdentityProviderClient,
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

/**
 * Test project with passwordless auth.
 */
class PasswordlessAuthTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/passwordless-auth';

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
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  /**
   * @inheritdoc
   */
  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);
    await this.assertPasswordlessAuth(backendId);
  }

  /**
   * creates assertions for passwordless auth
   */
  private async assertPasswordlessAuth(
    backendId: BackendIdentifier
  ): Promise<void> {
    const userPoolClientId = (
      await this.resourceFinder.find(backendId, 'AWS::Cognito::UserPoolClient')
    )[0];
    const userPoolId = (
      await this.resourceFinder.find(backendId, 'AWS::Cognito::UserPool')
    )[0];

    assert.ok(userPoolClientId);
    assert.ok(userPoolId);

    const passwordlessAuthAssertions = [
      new SignInWithMagicLink(
        this.cognitoIdentityProviderClient,
        userPoolId,
        userPoolClientId,
        getUsername()
      ).run(),
      new SignInWithMagicLinkWithUnverifiedAttribute(
        this.cognitoIdentityProviderClient,
        userPoolId,
        userPoolClientId,
        getUsername()
      ).run(),
    ];

    const assertions = await Promise.allSettled(passwordlessAuthAssertions);
    assertions.forEach((assertion) => {
      assert.equal(assertion.status, 'fulfilled');
    });
  }
}
