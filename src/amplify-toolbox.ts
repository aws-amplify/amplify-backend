import 'reflect-metadata';
import { getCommand as linkCommand } from './commands/link';
import { getCommand as pushCommand } from './commands/push';
import { getCommand as statusCommand } from './commands/status';
import { getCommand as synthCommand } from './commands/synth';
import { getCommand as watchCommand } from './commands/watch';
import { getCommand as paramCommand } from './commands/param';
import { Command } from '@commander-js/extra-typings';
import { AmplifyCommand } from './commands/command-components';

/**
 * This is the "new CLI" entry point
 *
 * It has a registry of different commands and delegates to the appropriate one based on the command line args
 */
export const main = async () => {
  const rootCommand = AmplifyCommand.create('nxt').description('CLI utility for working with Amplify projects').version('0.1.0');

  // TOOD should this be resolved / discovered at runtime?
  // this would allow different commands to be released / versioned independently of the platform
  const subCommandRegistry: Command<any[], any>[] = [linkCommand(), pushCommand(), watchCommand(), statusCommand(), synthCommand(), paramCommand()];

  subCommandRegistry.forEach((command) => rootCommand.addCommand(command));
  await rootCommand.parseAsync();
};
