import { createAmplifyDepUpdater } from './components/create_amplify_dep_updater.js';
import { getDependenciesFromPackageLock } from './components/get_dependencies_from_package_lock.js';

/**
 * This script will update the pinned versions of dependencies in create amplify
 * to stay up to date with what we are using in the library.
 */

const dependencies = await getDependenciesFromPackageLock('package-lock.json');

await createAmplifyDepUpdater(dependencies);
