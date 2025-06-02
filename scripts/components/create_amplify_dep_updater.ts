import fsp from 'fs/promises';
import { context } from '@actions/github';
import { Context } from '@actions/github/lib/context.js';
import path from 'path';
import { Dependency } from './get_dependencies_from_package_lock.js';
import {
  BumpType,
  ChangesetFrontMatterContent,
  createChangesetFile,
} from './create_changeset_file.js';

/**
 * Modifies target dependencies used for create amplify
 */
export const createAmplifyDepUpdater = async (
  dependencies: Dependency[],
  createAmplifyDepsToFilter: string[] = ['aws-cdk-lib'],
  ghContext: Context = context,
) => {
  const targetDependencies: Dependency[] = dependencies.filter((dependency) =>
    createAmplifyDepsToFilter.includes(dependency.name),
  );

  if (targetDependencies.length === 0) {
    return;
  }

  const defaultPackagesPath = path.join(
    process.cwd(),
    'packages/create-amplify/src/default_packages.json',
  );

  const dependenciesToUpdate = new Map(
    targetDependencies.map((dep) => [dep.name, dep.version]),
  );
  const defaultPackagesContent = JSON.parse(
    await fsp.readFile(defaultPackagesPath, 'utf-8'),
  );
  const defaultDevPackages: string[] =
    defaultPackagesContent.defaultDevPackages;
  const defaultProdPackages: string[] =
    defaultPackagesContent.defaultProdPackages;
  let update = false; // keeps track if any create amplify dep was updated

  // create new array of dev packages with possible updates
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

  // create new array of prod packages with possible updates
  const newProdPackages = defaultProdPackages.map((depString) => {
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
          defaultProdPackages: newProdPackages,
        },
        null,
        2,
      ),
    );
    // create changeset if event is a dependabot pull request
    if (
      ghContext.payload.pull_request &&
      ghContext.payload.pull_request.head.ref.startsWith('dependabot/')
    ) {
      const fileName = path.join(
        process.cwd(),
        `.changeset/dependabot-create-amplify-${ghContext.payload.pull_request.head.sha}.md`,
      );
      const frontMatterContent: ChangesetFrontMatterContent = {
        packageName: 'create-amplify',
        bumpType: BumpType.PATCH,
      };
      await createChangesetFile(
        fileName,
        [frontMatterContent],
        'bump create amplify dependencies',
      );
    }
  }
};
