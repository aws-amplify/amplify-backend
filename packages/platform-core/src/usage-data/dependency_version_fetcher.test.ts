import assert from 'assert';
import { describe, it } from 'node:test';
import { DependencyVersionFetcher } from './dependency_version_fetcher';
import { LockFileReader } from '../lock-file-reader/lock_file_reader_factory';

void describe('getDependencyVersions', () => {
  void it('successfully returns dependency versions', async () => {
    const lockFileReaderMock = {
      getLockFileContentsFromCwd: async () =>
        Promise.resolve({
          dependencies: [
            {
              name: 'aws-cdk',
              version: '1.2.3',
            },
            {
              name: 'aws-cdk-lib',
              version: '12.13.14',
            },
            {
              name: 'test_dep',
              version: '1.23.45',
            },
            {
              name: 'some_other_dep',
              version: '12.1.3',
            },
          ],
        }),
    } as LockFileReader;
    const dependencyVersionFetcher = new DependencyVersionFetcher(
      lockFileReaderMock
    );
    const dependencyVersions =
      await dependencyVersionFetcher.getDependencyVersions();
    const expectedVersions = [
      {
        name: 'aws-cdk',
        version: '1.2.3',
      },
      {
        name: 'aws-cdk-lib',
        version: '12.13.14',
      },
    ];

    assert.deepEqual(dependencyVersions, expectedVersions);
  });

  void it('returns empty array if there are no matching dependencies', async () => {
    const lockFileReaderMock = {
      getLockFileContentsFromCwd: async () =>
        Promise.resolve({
          dependencies: [
            {
              name: 'test_dep',
              version: '1.23.45',
            },
            {
              name: 'some_other_dep',
              version: '12.1.3',
            },
          ],
        }),
    } as LockFileReader;

    const dependencyVersionFetcher = new DependencyVersionFetcher(
      lockFileReaderMock
    );
    const dependencyVersions =
      await dependencyVersionFetcher.getDependencyVersions();

    assert.deepEqual(dependencyVersions, []);
  });
});
