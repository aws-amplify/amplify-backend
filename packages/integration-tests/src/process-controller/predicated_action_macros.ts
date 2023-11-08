import { PredicatedActionBuilder } from './predicated_action_queue_builder.js';

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
 * Reusable predicates: Wait for sandbox to become idle and emit "Watching for file changes..."
 */
export const waitForSandboxToBecomeIdle = () =>
  new PredicatedActionBuilder().waitForLineIncludes(
    'Watching for file changes...'
  );

/**
 * Reusable predicated action: Wait for sandbox delete to prompt to delete all the resource and respond with yes
 */
export const confirmDeleteSandbox = () => {
  let actionBuilder = new PredicatedActionBuilder()
    .waitForLineIncludes(
      'Are you sure you want to delete all the resources in your sandbox environment'
    )
    .sendYes();
  if (process.platform.includes('win32')) {
    actionBuilder = actionBuilder
      .waitForLineIncludes('Terminate batch job (Y/N)?')
      .sendYes();
  }
  return actionBuilder;
};

/**
 * Reusable predicated action: Wait for sandbox to prompt on quitting to delete all the resource and respond with no
 */
export const rejectCleanupSandbox = () => {
  let actionBuilder = new PredicatedActionBuilder()
    .waitForLineIncludes(
      'Would you like to delete all the resources in your sandbox environment'
    )
    .sendNo();
  if (process.platform.includes('win32')) {
    actionBuilder = actionBuilder
      .waitForLineIncludes('Terminate batch job (Y/N)?')
      .sendYes();
  }
  return actionBuilder;
};

/**
 * Reusable predicated action: Wait for sandbox to become idle and then update the
 * backend code which should trigger sandbox again
 */
export const updateFileContent = (from: URL, to: URL) => {
  return waitForSandboxToBecomeIdle().updateFileContent(from, to);
};

/**
 * Reusable predicated action: Wait for sandbox to become idle and then quit it (CTRL-C)
 */
export const interruptSandbox = () => waitForSandboxToBecomeIdle().sendCtrlC();

/**
 * Reusable predicated action: Wait for sandbox to finish deployment and assert that the deployment time is less
 * than the threshold.
 */
export const ensureDeploymentTimeLessThan = (seconds: number) => {
  return waitForSandboxDeploymentToPrintTotalTime().ensureDeploymentTimeLessThan(
    seconds
  );
};
