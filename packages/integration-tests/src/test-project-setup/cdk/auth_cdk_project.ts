import {
  TestCdkProjectCreator,
  testCdkProjectsSourceRoot,
} from './test_cdk_project_creator.js';
import { TestCdkProjectBase } from './test_cdk_project_base.js';
import { createEmptyCdkProject } from './create_empty_cdk_project.js';
import fs from 'fs/promises';
import path from 'path';
import { DeployedResourcesFinder } from '../../find_deployed_resource.js';
import assert from 'node:assert';
import { generateClientConfig } from '@aws-amplify/client-config';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

/**
 * Creates a CDK project with auth construct
 */
export class AuthTestCdkProjectCreator implements TestCdkProjectCreator {
  readonly name = 'auth-cdk';

  /**
   * Constructor.
   */
  constructor(private readonly resourceFinder: DeployedResourcesFinder) {}

  createProject = async (
    e2eProjectDir: string
  ): Promise<TestCdkProjectBase> => {
    const { projectName, projectRoot } = await createEmptyCdkProject(
      this.name,
      e2eProjectDir
    );

    const sourceProjectDirPath = path.resolve(
      testCdkProjectsSourceRoot,
      this.name
    );
    await fs.cp(sourceProjectDirPath, path.join(projectRoot, 'lib'), {
      recursive: true,
    });

    return new AuthTestCdkProject(
      projectName,
      projectRoot,
      this.resourceFinder
    );
  };
}

class AuthTestCdkProject extends TestCdkProjectBase {
  constructor(
    readonly name: string,
    readonly projectDirPath: string,
    private readonly resourceFinder: DeployedResourcesFinder
  ) {
    super(name, projectDirPath);
  }
  assertPostDeployment = async (): Promise<void> => {
    // assert has some of expected resources
    const userPools = await this.resourceFinder.findByStackName(
      this.stackName,
      'AWS::Cognito::UserPool'
    );
    assert.equal(userPools.length, 1);

    // assert that we can generate client config
    const clientConfig = await generateClientConfig(fromNodeProviderChain(), {
      stackName: this.stackName,
    });

    assert.ok(
      clientConfig.aws_user_pools_id,
      'client config should include user pool'
    );
  };
}
