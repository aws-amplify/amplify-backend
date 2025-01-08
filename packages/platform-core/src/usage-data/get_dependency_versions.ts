import {
  Dependencies,
  LockFileContents,
} from '../lock-file-reader/lock_file_reader_factory';

/**
 * Get dependency versions from customer project's lock file
 */
export const getDependencyVersions = (lockFileContents: LockFileContents) => {
  const targetDependencies = ['aws-cdk', 'aws-cdk-lib'];

  const dependencyVersions: Dependencies = [];

  for (const { name, version } of lockFileContents.dependencies) {
    if (targetDependencies.includes(name)) {
      dependencyVersions.push({ name, version });
    }
  }

  return dependencyVersions;
};
