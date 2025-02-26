import fsp from 'fs/promises';
import path from 'path';
import { Dependency } from './get_dependencies_from_package_lock.js';

/**
 * Modifies target dependencies used for create amplify
 */
export const createAmplifyDepUpdater = async (dependencies: Dependency[]) => {
  const createAmplifyDepsToFilter = ['aws-cdk', 'aws-cdk-lib'];
  const targetDependencies: Dependency[] = dependencies.filter((dependency) =>
    createAmplifyDepsToFilter.includes(dependency.name)
  );

  if (targetDependencies.length === 0) {
    return;
  }

  const defaultPackagesPath = path.join(
    process.cwd(),
    'packages/create-amplify/src/default_packages.json'
  );

  const dependenciesToUpdate = new Map(
    targetDependencies.map((dep) => [dep.name, dep.version])
  );
  const defaultPackagesContent = JSON.parse(
    await fsp.readFile(defaultPackagesPath, 'utf-8')
  );
  const defaultDevPackages: string[] =
    defaultPackagesContent.defaultDevPackages;
  const defaultProdPackages: string[] =
    defaultPackagesContent.defaultProdPackages;
  let update = false; // keeps track if any create amplify dep was updated

  const newDevPackages = defaultDevPackages.map((depString) => {
    if (!depString.includes('@')) {
      return depString;
    }

    const [depName] = depString.split('@');
    const expectedDepString = `${depName}@${dependenciesToUpdate.get(depName)}`;
    const hasDepName = dependenciesToUpdate.has(depName);
    update = update || (hasDepName && depString !== expectedDepString);
    return dependenciesToUpdate.has(depName) ? expectedDepString : depString;
  });

  if (update) {
    await fsp.writeFile(
      defaultPackagesPath,
      JSON.stringify(
        {
          defaultDevPackages: newDevPackages,
          defaultProdPackages,
        },
        null,
        2
      )
    );
  }
};
