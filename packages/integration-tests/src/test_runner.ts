import { afterEach, beforeEach, describe, test } from 'node:test';
import path from 'path';
import { execaSync } from 'execa';
import * as dirCompare from 'dir-compare';
import assert from 'node:assert';
import * as os from 'os';
import * as fs from 'fs';

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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await validateCdkOutDir(process.env.CDK_OUTDIR!, absoluteExpectedCdkOutDir);
  });
};

/**
 * TODO we will probably want to make this validation smarter over time
 * For example, parsing JSON files and checking that the objects are equivalent rather than just a blind file equivalence check
 * But this will get us started for now
 * @param actualDir The actual cdk synth result from the test
 * @param expectedDir The expected cdk synth result to validate against
 */
const validateCdkOutDir = async (actualDir: string, expectedDir: string) => {
  const compareResult = await dirCompare.compare(actualDir, expectedDir, {
    compareContent: true,
  });

  // files in the cdk.out directory that should be ignored when comparing for equality against the expected directory
  const ignoreFiles = ['tree.json'];
  let hasDiffs = false;
  (compareResult.diffSet || [])
    .filter((diff) => diff.state !== 'equal')
    .filter(
      (diff) =>
        !ignoreFiles.some((ignoreFile) => diff.name1?.endsWith(ignoreFile))
    )
    .forEach((diff) => {
      hasDiffs = true;
      switch (diff.state) {
        case 'left':
          console.log(
            `${diff.name1} exists in actual CDK out but is not expected`
          );
          break;
        case 'right':
          console.log(`${diff.name2} not found in CDK out but is expected`);
          break;
        case 'distinct':
          console.log(
            `Contents of ${diff.name1} are different in actual CDK out vs expected file`
          );
          // print the file diff using the diff utility
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          execaSync('diff', [diff.path1!, diff.path2!], { stdio: 'inherit' });
          break;
        default:
          assert.fail(`Unexpected diff state ${diff.state}`);
      }
    });
  if (hasDiffs) {
    assert.fail(`CDK output did not match expected content`);
  }
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
