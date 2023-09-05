import { LineActionQueueBuilder } from './line_action_queue_builder.js';

export const CONTROL_C = '\x03';

/**
 * Convenience actions that can be used to build up more complex CLI flows.
 * By composing flows from reusable macros we will hopefully avoid the situation in the classic CLI E2E tests where changing one CLI prompt requires updates to 97742 different E2E prompts
 */

export const confirmDeleteSandbox = new LineActionQueueBuilder()
  .waitForLineIncludes(
    'Are you sure you want to delete all the resources in your sandbox environment'
  )
  .sendYes();

export const rejectCleanupSandbox = new LineActionQueueBuilder()
  .waitForLineIncludes(
    'Would you like to delete all the resources in your sandbox environment'
  )
  .sendNo();

export const waitForSandboxDeployment =
  new LineActionQueueBuilder().waitForLineIncludes('Total time');

export const interruptSandbox = new LineActionQueueBuilder()
  .waitForLineIncludes('[Sandbox] Watching for file changes')
  .sendCtrlC();
