import assert from 'assert';
import { describe, it } from 'node:test';
import { getDependencyVersions } from './get_dependency_versions';
import { LockFileContents } from '../lock-file-reader/lock_file_reader_factory';

void describe('getDependencyVersions', () => {
  void it('successfully returns dependency versions', () => {
    const lockFileContents: LockFileContents = {
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
    };

    const dependencyVersions = getDependencyVersions(lockFileContents);
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

  void it('returns empty array if there are no matching dependencies', () => {
    const lockFileContents: LockFileContents = {
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
    };

    const dependencyVersions = getDependencyVersions(lockFileContents);
    assert.deepEqual(dependencyVersions, []);
  });
});
