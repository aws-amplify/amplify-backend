import { afterEach, beforeEach, describe, it } from 'node:test';
import path from 'path';
import assert from 'node:assert';
import * as os from 'os';
import * as fs from 'fs';
import { validateCdkOutDir } from './cdk_out_dir_validator.js';
import { pathToFileURL } from 'url';
import { CDKContextKey } from '@aws-amplify/platform-core';

export type CDKSynthSnapshotTestCase = {
  name: string;
  absoluteBackendFilePath: string;
  absoluteExpectedCdkOutDir: string;
};

/**
 * Run a set of integration test cases
 */
export const runCDKSnapshotTestSuite = (
  suiteName: string,
  testCases: CDKSynthSnapshotTestCase[]
) => {
  // concurrency of 1 is needed because the tests set environment variables that would create a race condition if multiple tests ran in parallel
  void describe(suiteName, { concurrency: 1 }, () => {
    testCases.forEach(runCDKSnapshotTest);
  });
};

/**
 * Executes a single CDK snapshot test
 *
 * It creates a temp dir for test synth output
 * It sets environment variables that are picked up by CDK synth to determine CDK context and synth output location
 * Then it synthesizes the provided CDK app under test and asserts that the synth output matches the expected output
 * Lastly it deletes the test synth dir
 */
const runCDKSnapshotTest = ({
  name,
  absoluteBackendFilePath,
  absoluteExpectedCdkOutDir,
}: CDKSynthSnapshotTestCase) => {
  beforeEach(async () => {
    // see https://github.com/aws/aws-cdk/blob/30596fe96bfba240a70e53ab64a9acbf39e92f77/packages/aws-cdk-lib/cx-api/lib/cxapi.ts#L4-L5
    process.env.CDK_OUTDIR = await createTempCdkOutDirForTest(name);
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      'backend-id': 'testAppId',
      'branch-name': 'testBranchName',
      [CDKContextKey.DEPLOYMENT_TYPE]: 'BRANCH',
      secretLastUpdated: 123456789,
    });
  });
  afterEach(() => {
    if (process.env.CDK_OUTDIR) {
      fs.rmSync(process.env.CDK_OUTDIR, { recursive: true, force: true });
    }
  });
  void it(name, async (t) => {
    // this import must create the CDK App
    await import(pathToFileURL(absoluteBackendFilePath).toString());

    // now we find and execute the synth beforeExit listener that the CDK App attaches to the process
    // see https://github.com/aws/aws-cdk/blob/9af05d85acf95138a149c03b1e4dfbc48284921a/packages/aws-cdk-lib/core/lib/app.ts#L192-L196
    const synth = process
      .listeners('beforeExit')
      .find((listener) => listener.toString().includes('this.synth()'));
    assert.ok(synth, 'Could not find synth listener in beforeExit listeners');
    synth(0);

    // remove the synth listener now that it's been executed
    // this allows other tests to run their synth command successfully
    process.removeAllListeners('beforeExit');

    // now check that the synth output matches the expected output
    assert.ok(
      process.env.CDK_OUTDIR,
      'CDK_OUTDIR environment variable not set'
    );

    const shouldSkipCdkOutValidation =
      process.env[
        'AMPLIFY_BACKEND_TESTS_DISABLE_INTEGRATION_SNAPSHOTS_COMPARISON'
      ] === 'true';
    if (shouldSkipCdkOutValidation) {
      t.diagnostic('Skipping CDK out validation.');
      return;
    }
    await validateCdkOutDir(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.env.CDK_OUTDIR!,
      absoluteExpectedCdkOutDir
    );
  });
};

/**
 * Creates a unique temp dir in the os temp dir location for the test to put cdk synth output
 * @param testName Used to make the temp dir identifiable with the test that created it
 */
const createTempCdkOutDirForTest = async (testName: string) => {
  const dirPrefix = testName.trim().replace(/\s+/, '_');
  return new Promise<string>((resolve, reject) => {
    fs.mkdtemp(path.resolve(os.tmpdir(), `${dirPrefix}_`), (err, dirName) => {
      if (err) reject(err);
      resolve(dirName);
    });
  });
};
