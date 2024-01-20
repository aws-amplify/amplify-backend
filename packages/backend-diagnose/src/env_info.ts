/* eslint-disable @typescript-eslint/naming-convention */
import * as os from 'node:os';
import { execa as _execa } from 'execa';
import envinfo from 'envinfo';
import { indent } from './indent.js';

export type EnvInfoBinary = {
  version: string;
  path: string;
};

export type EnvInfoNpmPackage =
  | {
      wanted: string;
      installed: string;
    }
  | string;

// write this manually given types are not available
export type EnvInfo = {
  System: {
    OS: string;
    CPU: string;
    Memory: string;
    Shell: EnvInfoBinary;
  };
  Binaries: {
    Node: EnvInfoBinary;
    Yarn: EnvInfoBinary;
    npm: EnvInfoBinary;
    pnpm: EnvInfoBinary;
  };
  npmPackages: Record<string, EnvInfoNpmPackage>;
};

/**
 * Get environment information
 */
export const getEnvInfo = async (): Promise<EnvInfo> => {
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
};

/**
 * Format environment information.
 * @param info - The environment information.
 * @returns The formatted environment information.
 */
export const formatEnvInfo = (info: EnvInfo) => {
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
};
