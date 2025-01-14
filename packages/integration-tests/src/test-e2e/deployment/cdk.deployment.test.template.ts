import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { testConcurrencyLevel } from '../test_concurrency.js';
import { TestCdkProjectBase } from '../../test-project-setup/cdk/test_cdk_project_base.js';
import { TestCdkProjectCreator } from '../../test-project-setup/cdk/test_cdk_project_creator.js';

/**
 * Defines cdk deployment test
 */
export const defineCdkDeploymentTest = (
  testCdkProjectCreator: TestCdkProjectCreator
) => {
  void describe(
    'cdk deployment tests',
    { concurrency: testConcurrencyLevel },
    () => {
      before(async () => {
        await createTestDirectory(rootTestDir);
      });
      after(async () => {
        await deleteTestDirectory(rootTestDir);
      });

      void describe('cdk deploys', () => {
        void describe(`${testCdkProjectCreator.name}`, () => {
          let testCdkProject: TestCdkProjectBase;

          beforeEach(async () => {
            testCdkProject = await testCdkProjectCreator.createProject(
              rootTestDir
            );
          });

          afterEach(async () => {
            await testCdkProject.tearDown();
          });

          void it(`deploys`, async () => {
            await testCdkProject.deploy();
            await testCdkProject.assertPostDeployment();
          });
        });
      });
    }
  );
};
