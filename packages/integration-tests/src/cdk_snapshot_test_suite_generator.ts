import { CDKSynthSnapshotTestCase } from './cdk_snapshot_test_runner.js';
import { BackendLocator } from '@aws-amplify/platform-core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Constructs an IntegrationTestCase[] given a directory that conforms to the following convention:
 *
 * If dirPath is an absolute path, it points to the directory
 * If dirPath is relative, the directory is located at path.resolve(\<this file location\>, relativeDirPath)
 * Each subdirectory is the name of the test
 * Within each test directory is a backend.ts file that contains the `defineBackend({...})` entry point
 * Within each test directory is an `expected-cdk-out` directory that contains a snapshot of the expected synthesis result of the backend
 * @example
 *
 * \<relativeDirRoot\>
 *     test-name-1
 *       backend.ts
 *       expected-cdk-out
 *     test-name-2
 *       backend.ts
 *       expected-cdk-out
 */
export const fromConventionalDir = (
  dirPath: string
): CDKSynthSnapshotTestCase[] => {
  const rootDir = path.isAbsolute(dirPath)
    ? new URL(dirPath)
    : new URL(dirPath, import.meta.url);
  const testDirectories = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  return testDirectories.map((testDirectory) => ({
    name: testDirectory.name,
    absoluteBackendFilePath: path.resolve(
      fileURLToPath(rootDir),
      testDirectory.name,
      new BackendLocator(
        path.join(fileURLToPath(rootDir), testDirectory.name)
      ).locate()
    ),
    absoluteExpectedCdkOutDir: path.join(
      fileURLToPath(rootDir),
      testDirectory.name,
      'expected-cdk-out'
    ),
  }));
};
