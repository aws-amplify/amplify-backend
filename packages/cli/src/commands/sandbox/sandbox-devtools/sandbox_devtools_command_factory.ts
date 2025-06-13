import { CommandModule } from 'yargs';
import { SandboxDevToolsCommand } from './sandbox_devtools_command.js';

/**
 * Factory for creating SandboxDevToolsCommand instances.
 */
export class SandboxDevToolsCommandFactory {
  /**
   * Creates a new SandboxDevToolsCommand instance.
   * @returns A CommandModule instance for the sandbox devtools command
   */
  create(): CommandModule<object, object> {
    return new SandboxDevToolsCommand();
  }
}
