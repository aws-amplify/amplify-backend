import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { amplifyCli } from '../process-controller/process_controller.js';
import assert from 'node:assert';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeployment,
} from '../process-controller/command_macros.js';
import { shortUuid } from '../short_uuid.js';

describe('[E2E] sandbox', () => {
  const e2eSandboxDir = new URL('./e2e-sandboxes', import.meta.url);
  before(async () => {
    if (!existsSync(e2eSandboxDir)) {
      await fs.mkdir(e2eSandboxDir, { recursive: true });
    }
  });

  after(async () => {
    await fs.rm(e2eSandboxDir, { recursive: true });
  });

  let testProjectRoot: string;
  let testAmplifyDir: string;
  beforeEach(async () => {
    testProjectRoot = await fs.mkdtemp(
      path.join(fileURLToPath(e2eSandboxDir), 'test-sandbox')
    );
    await fs.writeFile(
      path.join(testProjectRoot, 'package.json'),
      JSON.stringify({ name: `test-sandbox-${shortUuid()}` }, null, 2)
    );

    testAmplifyDir = path.join(testProjectRoot, 'amplify');
    await fs.mkdir(testAmplifyDir);
  });

  afterEach(async () => {
    await amplifyCli(['sandbox', 'delete'], testProjectRoot)
      .do(confirmDeleteSandbox)
      .run();
    await fs.rm(testProjectRoot, { recursive: true });
  });

  const testProjects = [
    {
      initialAmplifyDirPath: new URL(
        '../../test-projects/basic-auth-data-storage-function/amplify',
        import.meta.url
      ),
      name: 'basic-auth-data-storage-function',
    },
  ];

  testProjects.forEach((testProject) => {
    it(`[E2E] ${testProject.name}`, async () => {
      await fs.cp(testProject.initialAmplifyDirPath, testAmplifyDir, {
        recursive: true,
      });

      await amplifyCli(['sandbox'], testProjectRoot)
        .do(waitForSandboxDeployment)
        .do(interruptSandbox)
        .do(rejectCleanupSandbox)
        .run();

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
    });
  });
});
