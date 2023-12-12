import { type PackageManagerName } from '../package-manager-controller/index.js';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import { PnpmProjectInitializer } from './pnpm_project_initializer.js';
import { YarnClassicProjectInitializer } from './yarn_classic_project_initializer.js';
import { YarnModernProjectInitializer } from './yarn_modern_project_initializer.js';

/**
 * projectInitializerFactory
 */
export const projectInitializerFactory = (
  packageManagerName: PackageManagerName
) => {
  switch (packageManagerName) {
    case 'npm':
      return NpmProjectInitializer;
    case 'pnpm':
      return PnpmProjectInitializer;
    case 'yarn-classic':
      return YarnClassicProjectInitializer;
    case 'yarn-modern':
      return YarnModernProjectInitializer;
    default:
      return NpmProjectInitializer;
  }
};
