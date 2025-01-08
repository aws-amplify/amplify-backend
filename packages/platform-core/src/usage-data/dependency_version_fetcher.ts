import {
  Dependencies,
  LockFileReader,
  LockFileReaderFactory,
} from '../lock-file-reader/lock_file_reader_factory';

/**
 * Get dependency versions from customer project's lock file
 */
export class DependencyVersionFetcher {
  /**
   * Creates dependency version fetcher
   */
  constructor(
    private readonly lockFileReader: LockFileReader = new LockFileReaderFactory().getLockFileReader()
  ) {}

  getDependencyVersions = async () => {
    const lockFileContents =
      await this.lockFileReader.getLockFileContentsFromCwd();
    const targetDependencies = ['aws-cdk', 'aws-cdk-lib'];

    const dependencyVersions: Dependencies = [];

    for (const { name, version } of lockFileContents.dependencies) {
      if (targetDependencies.includes(name)) {
        dependencyVersions.push({ name, version });
      }
    }

    return dependencyVersions;
  };
}
