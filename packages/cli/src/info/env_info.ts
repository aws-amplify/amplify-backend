import * as os from 'node:os';
import envinfo from 'envinfo';
import { printer } from '../printer.js';
import { EnvInfo } from './env_info_types.js';

/**
 * Provides environment information.
 */
export class EnvironmentInfoProvider {
  /**
   * Get environment information
   */
  async getEnvInfo(): Promise<EnvInfo> {
    const info = await envinfo.run(
      {
        System: ['OS', 'CPU', 'Memory', 'Shell'],
        Binaries: ['Node', 'Yarn', 'npm', 'pnpm'],
        npmPackages: [
          '@aws-amplify/backend',
          '@aws-amplify/backend-cli',
          'typescript',
          'aws-cdk',
          'aws-cdk-lib',
          'aws-amplify',
        ],
        // npmGlobalPackages: ['@aws-amplify/cli'],
      },
      { json: true, showNotFound: true }
    );
    return JSON.parse(info);
  }

  /**
   * Format environment information.
   * @param info - The environment information.
   * @returns The formatted environment information.
   */
  formatEnvInfo(info: EnvInfo): string {
    const system = [
      'System:',
      ...Object.entries(info.System).map(([part, details]) => {
        if (typeof details !== 'string') {
          return printer.format(`${part}: ${details.path}`, 2);
        }
        return printer.format(`${part}: ${details}`, 2);
      }),
    ];
    const binaries = [
      'Binaries:',
      ...Object.entries(info.Binaries).map(([name, binary]) => {
        return printer.format(`${name}: ${binary.version} - ${binary.path}`, 2);
      }),
    ];
    const npmPackages = [
      'NPM Packages:',
      ...Object.entries(info.npmPackages).map(([name, details]) => {
        if (typeof details !== 'string') {
          return printer.format(`${name}: ${details.installed}`, 2);
        }
        return printer.format(`${name}: ${details}`, 2);
      }),
    ];

    const output = [system, binaries, npmPackages].flat().join(os.EOL);
    return output;
  }
}
