import { afterEach, beforeEach, describe, it } from 'node:test';
import path from 'path';
import fs from 'fs/promises';
import { amplifyCli } from '../process-controller/process_controller.js';
import assert from 'node:assert';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeployment,
} from '../process-controller/stdio_interaction_macros.js';
import { createEmptyAmplifyProject } from '../create_empty_amplify_project.js';
import {
  createTestDirectoryBeforeAndCleanupAfter,
  getTestDir,
} from '../setup_test_directory.js';

describe('sandbox', () => {
  const e2eSandboxDir = getTestDir;
  createTestDirectoryBeforeAndCleanupAfter(e2eSandboxDir);

  let testProjectRoot: string;
  let testAmplifyDir: string;
  beforeEach(async () => {
    ({ testProjectRoot, testAmplifyDir } = await createEmptyAmplifyProject(
      'test-sandbox',
      e2eSandboxDir
    ));
  });

  afterEach(async () => {
    await amplifyCli(['sandbox', 'delete'], testProjectRoot)
      .do(confirmDeleteSandbox)
      .run();
    await fs.rm(testProjectRoot, { recursive: true });
  });

  const testProjects = [
    {
      name: 'basic-auth-data-storage-function',
      initialAmplifyDirPath: new URL(
        '../../test-projects/basic-auth-data-storage-function/amplify',
        import.meta.url
      ),
      assertions: async () => {
        const { default: clientConfig } = await import(
          path.join(testProjectRoot, 'amplifyconfiguration.js')
        );
        assert.deepStrictEqual(Object.keys(clientConfig).sort(), [
          'aws_appsync_authenticationType',
          'aws_appsync_graphqlEndpoint',
          'aws_appsync_region',
          'aws_cognito_region',
          'aws_user_files_s3_bucket',
          'aws_user_files_s3_bucket_region',
          'aws_user_pools_id',
          'aws_user_pools_web_client_id',
        ]);
      },
    },
  ];

  testProjects.forEach((testProject) => {
    it(testProject.name, async () => {
      await fs.cp(testProject.initialAmplifyDirPath, testAmplifyDir, {
        recursive: true,
      });

      await amplifyCli(['sandbox'], testProjectRoot)
        .do(waitForSandboxDeployment)
        .do(interruptSandbox)
        .do(rejectCleanupSandbox)
        .run();

      await testProject.assertions();
    });
  });
});
