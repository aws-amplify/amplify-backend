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
    // TODO alternative considered:
    // Other option was to have seed.ts export a function but it causes the following problems:
    // 1. In order to load it dynamically it must be compiled to js
    // 2. It may import backend.ts for dynamic typing, that import makes TSC compile whole graph
    // 3. Pointing tsc to seed.ts makes it hard/impossible to properly honor tsconfig.json (same problems we had when discussing what to do with tsconfig.json in amplify folder.
    //
    // Therefore the POC pivots here to make the script self contained and executable with tsx.
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
