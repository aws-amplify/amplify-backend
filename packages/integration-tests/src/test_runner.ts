import { afterEach, beforeEach, describe, test } from 'node:test';
import path from 'path';
import assert from 'node:assert';
import * as os from 'os';
import * as fs from 'fs';
import { validateCdkOutDir } from './validate_cdk_out_dir.js';

export type IntegrationTestCase = {
  name: string;
  absoluteBackendFilePath: string;
  absoluteExpectedCdkOutDir: string;
};

/**
 * Run a set of integration test cases
 */
export const runTestSuite = (
  suiteName: string,
  testCases: IntegrationTestCase[]
) => {
  describe(suiteName, { concurrency: 1 }, () => {
    testCases.forEach(runTestCase);
  });
};

/**
 * Executes a single integration test case
 *
 * It creates a temp dir for test synth output
 * It sets environment variables that are picked up by CDK synth to determine CDK context and synth output location
 * Then it synthesizes the provided CDK app under test and asserts that the synth output matches the expected output
 * Lastly it deletes the test synth dir
 */
const runTestCase = ({
  name,
  absoluteBackendFilePath,
  absoluteExpectedCdkOutDir,
}: IntegrationTestCase) => {
  beforeEach(async () => {
    // see https://github.com/aws/aws-cdk/blob/30596fe96bfba240a70e53ab64a9acbf39e92f77/packages/aws-cdk-lib/cx-api/lib/cxapi.ts#L4-L5
    process.env.CDK_OUTDIR = await createTempCdkOutDirForTest(name);
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      'project-name': 'testProject',
      'environment-name': 'testEnvironment',
    });
  });
  afterEach(() => {
    if (process.env.CDK_OUTDIR) {
      fs.rmSync(process.env.CDK_OUTDIR, { recursive: true, force: true });
    }
  });
  test(name, async () => {
    // this import must create the CDK App
    await import(absoluteBackendFilePath);

    // now we find and execute the synth beforeExit listener that the CDK App attaches to the process
    const synth = process
      .listeners('beforeExit')
      .find((listener) => listener.toString().includes('this.synth()'));
    assert.ok(synth, 'Could not find synth listener in beforeExit listeners');
    synth(0);

    // now check that the synth output matches the expected output
    assert.ok(
      process.env.CDK_OUTDIR,
      'CDK_OUTDIR environment variable not set'
    );

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
