import { execa as _execa } from 'execa';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller.js';
import { logger } from './logger.js';
import stream from 'stream';

/**
 *
 */
export class NpmPackageManagerController implements PackageManagerController {
  /**
   * Abstraction around npm commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly execa = _execa
  ) {}
  private readonly executableName = 'npm';

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = ['install'].concat(...packageNames);
    const typeDev = type === 'dev';
    if (typeDev) {
      args.push('--save-dev');
    }

    try {
      const childProcess = this.execa(this.executableName, args, {
        stdin: 'inherit',
        cwd: this.projectRoot,
      });

      childProcess?.stdout?.on('data', (data) => logger.debug(data));
      childProcess?.stderr?.on('data', (data) => logger.debug(data));

      await childProcess;
    } catch {
      throw new Error(
        `\`npm install ${packageNames.join(' ')}${
          typeDev ? ' --save-dev' : ''
        }\` did not exit successfully.`
      );
    }
  };
}
