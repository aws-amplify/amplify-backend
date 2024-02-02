import * as os from 'node:os';
import envinfo from 'envinfo';
import { format } from '@aws-amplify/cli-core';
import { EnvInfo } from './env_info_provider_types.js';

/**
 * Provides environment information.
 */
export class EnvironmentInfoProvider {
  /**
   * Get environment information
   */
  async getEnvInfo(): Promise<string> {
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
      },
      { json: true, showNotFound: true }
    );
    return this.formatEnvInfo(JSON.parse(info));
  }

  /**
   * Format environment information.
   * @param info - The environment information.
   * @returns The formatted environment information.
   */
  private formatEnvInfo(info: EnvInfo): string {
    const system = [
      'System:',
      ...Object.entries(info.System).map(([part, details]) => {
        if (typeof details !== 'string') {
          return format.indent(`${part}: ${details.path}`);
        }
        return format.indent(`${part}: ${details}`);
      }),
    ];
    const binaries = [
      'Binaries:',
      ...Object.entries(info.Binaries).map(([name, binary]) => {
        return format.indent(`${name}: ${binary.version} - ${binary.path}`);
      }),
    ];
    const npmPackages = [
      'NPM Packages:',
      ...Object.entries(info.npmPackages).map(([name, details]) => {
        if (typeof details !== 'string') {
          return format.indent(`${name}: ${details.installed}`);
        }
        return format.indent(`${name}: ${details}`);
      }),
    ];

    const output = [system, binaries, npmPackages].flat().join(os.EOL);
    return output;
  }
}
