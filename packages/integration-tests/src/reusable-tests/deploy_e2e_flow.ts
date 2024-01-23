import * as fsp from 'fs/promises';
import assert from 'assert';
import { getClientConfigPath } from '@aws-amplify/client-config';
import { TestBranch } from '../amplify_app_pool.js';
import { type PackageManager } from '../setup_package_manager.js';
import {
  amplifyCli,
  runPackageManager,
} from '../process-controller/process_controller.js';

/**
 * Deploy a pipeline and verify that it deploys without an error
 */
export const deployE2eFlow = async (
  packageManager: PackageManager,
  tempDir: string,
  testBranch: TestBranch
) => {
  await runPackageManager(
    packageManager,
    ['create', 'amplify', '--yes'],
    tempDir
  ).run();

  await amplifyCli(
    [
      'pipeline-deploy',
      '--branch',
      testBranch.branchName,
      '--appId',
      testBranch.appId,
    ],
    tempDir,
    {
      env: { CI: 'true' },
    }
  ).run();

  const clientConfigStats = await fsp.stat(await getClientConfigPath(tempDir));

  assert.ok(clientConfigStats.isFile());
};
