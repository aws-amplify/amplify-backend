import { PredicatedActionBuilder } from './predicated_action_queue_builder.js';
import { PlatformDeploymentThresholds } from '../test-project-setup/test_project_base.js';
import { CopyDefinition } from './types.js';

/**
 * Convenience predicated actions that can be used to build up more complex CLI flows.
 * By composing flows from reusable macros we will hopefully avoid the situation in the
 * classic CLI E2E tests where changing one CLI prompt requires updates to 97742 different E2E prompts
 */

/**
 * Reusable predicates: Wait for sandbox to finish and emit "✨  Total time: xx.xxs"
 */
export const waitForSandboxDeploymentToPrintTotalTime = () =>
  new PredicatedActionBuilder().waitForLineIncludes('Total time');

/**
 * Reusable predicates: Wait for sandbox to finish and emit "File written: amplify_outputs.json"
 */
export const waitForConfigUpdateAfterDeployment = () =>
  new PredicatedActionBuilder().waitForLineIncludes(
    'File written: amplify_outputs.json'
  );

/**
 * Reusable predicates: Wait for sandbox to become idle and emit "Watching for file changes..."
 */
export const waitForSandboxToBecomeIdle = () =>
  new PredicatedActionBuilder().waitForLineIncludes(
    'Watching for file changes...'
  );

/**
 * Reusable predicated action: Wait for sandbox delete to prompt to delete all the resource and respond with yes
 */
export const confirmDeleteSandbox = () =>
  new PredicatedActionBuilder()
    .waitForLineIncludes(
      'Are you sure you want to delete all the resources in your sandbox environment'
    )
    .sendYes();

/**
 * Reusable predicated action: Wait for sandbox to prompt on quitting to delete all the resource and respond with no
 */
export const rejectCleanupSandbox = () =>
  new PredicatedActionBuilder()
    .waitForLineIncludes(
      'Would you like to delete all the resources in your sandbox environment'
    )
    .sendNo();

/**
 * Reusable predicated action: Wait for sandbox to become idle,
 * then perform the specified file replacements in the backend code which will trigger sandbox again
 */
export const replaceFiles = (replacements: CopyDefinition[]) => {
  return waitForSandboxToBecomeIdle().replaceFiles(replacements);
};

/**
 * Reusable predicated action: Wait for sandbox to become idle and then quit it (CTRL-C)
 */
export const interruptSandbox = () => waitForSandboxToBecomeIdle().sendCtrlC();

/**
 * Reusable predicated action: Wait for sandbox to finish deployment and assert that the deployment time is less
 * than the threshold.
 */
export const ensureDeploymentTimeLessThan = (
  platformThresholds: PlatformDeploymentThresholds
) => {
  return waitForSandboxDeploymentToPrintTotalTime().ensureDeploymentTimeLessThan(
    process.platform.startsWith('win')
      ? platformThresholds.onWindows
      : platformThresholds.onOther
  );
};
