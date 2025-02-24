import fsp from 'fs/promises';
import path from 'path';
import { Dependency } from './get_dependencies_from_package_lock.js';

/**
 * Modifies target dependencies used for create amplify
 * @returns boolean indicating if create amplify dependencies are updated
 */
export const createAmplifyDepUpdater = async (dependencies: Dependency[]) => {
  const targetDependencies = ['aws-cdk', 'aws-cdk-lib'];
  const dependenciesToUpdate: Dependency[] = [];

  for (const dep of dependencies) {
    if (targetDependencies.includes(dep.name)) {
      dependenciesToUpdate.push(dep);
    }
  }

  if (dependenciesToUpdate.length === 0) {
    return false;
  }

  const defaultPackagesPath = path.join(
    process.cwd(),
    'packages/create-amplify/src/default_packages.ts'
  );

  let defaultPackagesContent = await fsp.readFile(defaultPackagesPath, 'utf-8');

  dependenciesToUpdate.forEach((dep) => {
    // taken from lodash escapeRegExp and used to sanitize dep.name before using it in RegExp
    // can be replaced by RegExp.escape once it is available
    const safeDepName = dep.name.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    const depRegex = new RegExp(`'${safeDepName}.*'`);
    defaultPackagesContent = defaultPackagesContent.replace(
      depRegex,
      `'${dep.name}@${dep.version}'`
    );
  });

  await fsp.writeFile(defaultPackagesPath, defaultPackagesContent);
  return true;
};
