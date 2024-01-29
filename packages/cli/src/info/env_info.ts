import * as os from 'node:os';
import envinfo from 'envinfo';
import { indent } from './indent.js';
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
          return indent(`${part}: ${details.path}`);
        }
        return indent(`${part}: ${details}`);
      }),
    ];
    const binaries = [
      'Binaries:',
      ...Object.entries(info.Binaries).map(([name, binary]) => {
        return indent(`${name}: ${binary.version} - ${binary.path}`);
      }),
    ];
    const npmPackages = [
      'NPM Packages:',
      ...Object.entries(info.npmPackages).map(([name, details]) => {
        if (typeof details !== 'string') {
          return indent(`${name}: ${details.installed}`);
        }
        return indent(`${name}: ${details}`);
      }),
    ];

    const output = [system, binaries, npmPackages].flat().join(os.EOL);
    return output;
  }
}
