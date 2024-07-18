import { EOL } from 'os';
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
          '@aws-amplify/auth-construct',
          '@aws-amplify/backend',
          '@aws-amplify/backend-auth',
          '@aws-amplify/backend-cli',
          '@aws-amplify/backend-data',
          '@aws-amplify/backend-deployer',
          '@aws-amplify/backend-function',
          '@aws-amplify/backend-output-schemas',
          '@aws-amplify/backend-output-storage',
          '@aws-amplify/backend-secret',
          '@aws-amplify/backend-storage',
          '@aws-amplify/cli-core',
          '@aws-amplify/client-config',
          '@aws-amplify/deployed-backend-client',
          '@aws-amplify/form-generator',
          '@aws-amplify/model-generator',
          '@aws-amplify/platform-core',
          '@aws-amplify/plugin-types',
          '@aws-amplify/sandbox',
          '@aws-amplify/schema-generator',
          'typescript',
          'aws-cdk',
          'aws-cdk-lib',
          'aws-amplify',
        ],
      },
      { json: true, showNotFound: true, fullTree: true }
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
        // envinfo with fullTree: true returns the version of the project package.json under %name% which we don't care about
        if (name === '%name%') {
          return;
        }
        if (typeof details === 'string') {
          return format.indent(`${name}: ${details}`);
        } else if (Object.keys(details).length === 0) {
          // if package details are empty, exclude it from the output. Note that this is different than the package not being installed
          // the potential for empty details seems to be a side-effect of fullTree: true on envinfo
          return;
        }
        return format.indent(`${name}: ${details.installed}`);
      }),
    ];

    const output = [system, binaries, npmPackages]
      .flat()
      .filter((line) => !!line)
      .join(EOL);
    return output;
  }
}
