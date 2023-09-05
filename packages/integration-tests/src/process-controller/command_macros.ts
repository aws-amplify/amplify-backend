import { LineActionQueueBuilder } from './line_action_queue_builder.js';

export const CONTROL_C = '\x03';

export const commandMacros = {
  confirmDeleteSandbox: new LineActionQueueBuilder()
    .waitForLineIncludes(
      'Are you sure you want to delete all the resources in your sandbox environment'
    )
    .sendYes(),
  rejectCleanupSandbox: new LineActionQueueBuilder()
    .waitForLineIncludes(
      'Would you like to delete all the resources in your sandbox environment'
    )
    .sendNo(),
  interruptSandbox: new LineActionQueueBuilder()
    .waitForLineIncludes('[Sandbox] Watching for file changes')
    .sendCtrlC(),
} as const;
