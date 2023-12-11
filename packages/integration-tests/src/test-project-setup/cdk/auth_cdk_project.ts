import {
  TestCdkProjectCreator,
  testCdkProjectsSourceRoot,
} from './test_cdk_project_creator.js';
import { TestCdkProjectBase } from './test_cdk_project_base.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { createEmptyCdkProject } from './create_empty_cdk_project.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Creates a CDK project with auth construct
 */
export class AuthTestCdkProjectCreator implements TestCdkProjectCreator {
  readonly name = 'auth-cdk';

  /**
   * Constructor.
   */
  constructor(private readonly cfnClient: CloudFormationClient) {}

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
    await fs.cp(sourceProjectDirPath, projectRoot, {
      recursive: true,
    });

    return new AuthTestCdkProject(projectName, projectRoot, this.cfnClient);
  };
}

class AuthTestCdkProject extends TestCdkProjectBase {
  assertPostDeployment = (): Promise<void> => {
    return Promise.resolve(undefined);
  };
}
