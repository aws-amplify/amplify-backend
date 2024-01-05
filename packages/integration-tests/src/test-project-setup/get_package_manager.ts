/**
 * getPackageManagerProps - returns the package manager properties
 */
export const getPackageManagerProps = () => {
  const { PACKAGE_MANAGER_EXECUTABLE = 'npm' } = process.env;
  switch (PACKAGE_MANAGER_EXECUTABLE) {
    case 'npm':
      return {
        name: 'npm',
        executable: 'npm',
        installCommand: 'install',
        binaryRunner: 'npx',
      };
    case 'yarn-classic':
    case 'yarn-modern':
      return {
        name: 'yarn',
        executable: 'yarn',
        installCommand: 'add',
        binaryRunner: 'yarn',
      };
    case 'pnpm':
      return {
        name: 'pnpm',
        executable: 'pnpm',
        installCommand: 'add',
        binaryRunner: 'pnpm',
      };
    default:
      throw new Error(
        `Unknown package manager executable: ${PACKAGE_MANAGER_EXECUTABLE}`
      );
  }
};
