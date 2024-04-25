import { AmplifyUserError } from '@aws-amplify/platform-core';
import { cyan } from 'kleur/colors';

/**
 * Reads the npm_config_user_agent environment variable to determine the package manager that is currently being used.
 * Throws if npm_config_user_agent is not set.
 */
export const getPackageManagerName = () => {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent === undefined) {
    throw new AmplifyUserError('NoPackageManagerError', {
      message: `npm_config_user_agent environment variable is undefined`,
      details:
        'This is usually caused by running commands without a package manager',
      // Note that we cannot use the format object to format the command here because that would create a circular dependency
      resolution: `Run commands via your package manager. For example: ${cyan(
        'npx amplify <command>'
      )} if npm is your package manager.`,
    });
  }
  const packageManagerAndVersion = userAgent.split(' ')[0];
  const [packageManagerName, packageManagerVersion] =
    packageManagerAndVersion.split('/');

  if (packageManagerName === 'yarn') {
    const yarnMajorVersion = packageManagerVersion.split('.')[0];
    return `yarn-${yarnMajorVersion === '1' ? 'classic' : 'modern'}`;
  }
  return packageManagerName;
};

const runnerMap: Record<string, string> = {
  npm: 'npx',
  'yarn-modern': 'yarn',
  'yarn-classic': 'yarn',
  pnpm: 'pnpm',
};

/**
 * Tries to determine the package manager runner that is currently being used. Eg 'npx' for 'npm' and 'yarn' for 'yarn'.
 */
export const getPackageManagerRunnerName = (): string => {
  const packageManagerName = getPackageManagerName();
  const packageManagerRunnerName = runnerMap[packageManagerName];
  if (!packageManagerRunnerName) {
    throw new AmplifyUserError('UnsupportedPackageManagerError', {
      message: `Package manager ${packageManagerName} is not supported.`,
      resolution: 'Use npm, yarn, or pnpm.',
    });
  }
  return packageManagerRunnerName;
};
