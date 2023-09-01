import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import assert from 'node:assert';
import { ProcessController } from '../process_controller.js';

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

  let testDir: string;
  beforeEach(async () => {
    testDir = await fs.mkdtemp(
      path.join(e2eSandboxDir.toString(), 'test-create-amplify')
    );
    // creating a package.json beforehand skips the npm init in create-amplify
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test-project-name' }, null, 2)
    );
  });

  const testProjects = [
    {
      initialStatePath: new URL(
        '../test-projects/basic-auth-data-storage-function',
        import.meta.url
      ),
      name: 'basic-auth-data-storage-function',
    },
  ];

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true });
  });

  describe('sandbox', () => {
    it('deploys fully loaded project', async () => {
      const sandboxProcess = ProcessController.fromCommand(
        'npx',
        ['amplify', 'sandbox'],
        { cwd: testDir }
      );
      await sandboxProcess.waitForLineIncludes(
        '[Sandbox] Watching for file changes'
      );
      sandboxProcess.kill();
      const clientConfig = await import(
        path.join(testDir, 'amplifyconfiguration.js')
      );
      assert.deepStrictEqual(Object.keys(clientConfig).sort(), [
        'aws_user_pools_id',
        'aws_user_pools_web_client_id',
        'aws_cognito_region',
        'aws_appsync_graphqlEndpoint',
        'aws_appsync_region',
        'aws_appsync_authenticationType',
        'aws_user_files_s3_bucket_region',
        'aws_user_files_s3_bucket',
      ]);
    });
  });
});
