import { Argv, CommandModule } from 'yargs';
import { existsSync } from 'fs';
import path from 'path';
import { execa } from 'execa';

/**
 * Command to seed sandbox.
 */
export class SandboxSeedCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Root command to manage sandbox secret
   */
  constructor() {
    this.command = 'seed';
    this.describe = 'Seed sandbox with data';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const seedPath = path.join('amplify', 'seed.ts');
    await execa('tsx', [seedPath], { cwd: process.cwd(), stdio: 'inherit' });
    return;
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.check(() => {
      const seedPath = path.join(process.cwd(), 'amplify', 'seed.ts');
      if (!existsSync(seedPath)) {
        throw new Error(`${seedPath} must exist`);
      }
      return true;
    });
  };
}
