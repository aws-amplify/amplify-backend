import * as fsp from 'fs/promises';
import assert from 'assert';
import { getClientConfigPath } from '@aws-amplify/client-config';
import { type PackageManager } from '../setup_package_manager.js';
import {
  amplifyCli,
  runPackageManager,
} from '../process-controller/process_controller.js';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeploymentToPrintTotalTime,
} from '../process-controller/predicated_action_macros.js';

/**
 * Deploy a sandbox and verify that it deploys without an error
 */
export const createAmplifyAndSandbox = async (
  packageManager: PackageManager,
  tempDir: string
) => {
  await runPackageManager(
    packageManager,
    ['create', 'amplify', '--yes'],
    tempDir
  ).run();

  await amplifyCli(['sandbox'], tempDir)
    .do(waitForSandboxDeploymentToPrintTotalTime())
    .do(interruptSandbox())
    .do(rejectCleanupSandbox())
    .run();

  const clientConfigStats = await fsp.stat(await getClientConfigPath(tempDir));

  assert.ok(clientConfigStats.isFile());

  await amplifyCli(['sandbox', 'delete'], tempDir)
    .do(confirmDeleteSandbox())
    .run();
};
