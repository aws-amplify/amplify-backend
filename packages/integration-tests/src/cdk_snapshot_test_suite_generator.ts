import { CDKSnapshotTestCase } from './cdk_snapshot_test_runner.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Constructs an IntegrationTestCase[] given a directory that conforms to the following convention:
 *
 * If dirPath is an absolute path, it points to the directory
 * If dirPath is relative, the directory is located at path.resolve(<this file location>, relativeDirPath)
 * Each subdirectory is the name of the test
 * Within each test directory is an index.ts file that contains the `new Backend({...})` entry point
 * Within each test directory is an `expected-cdk-out` directory that contains a snapshot of the expected synthesis result of the backend
 * @example
 *
 * <relativeDirRoot>
 *     test-name-1
 *       index.ts
 *       expected-cdk-out
 *     test-name-2
 *       index.ts
 *       expected-cdk-out
 */
export const fromConventionalDir = (dirPath: string): CDKSnapshotTestCase[] => {
  const rootDir = path.isAbsolute(dirPath)
    ? new URL(dirPath)
    : new URL(dirPath, import.meta.url);
  const testDirectories = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  return testDirectories.map((testDirectory) => ({
    name: testDirectory.name,
    absoluteBackendFilePath: path.resolve(
      rootDir.pathname,
      testDirectory.name,
      'index.ts'
    ),
    absoluteExpectedCdkOutDir: path.resolve(
      rootDir.pathname,
      testDirectory.name,
      'expected-cdk-out'
    ),
  }));
};
