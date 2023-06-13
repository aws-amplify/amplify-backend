import * as fs from 'fs-extra';
import { z } from 'zod';
import { execa, execaSync } from 'execa';
import * as path from 'path';
import * as dirCompare from 'dir-compare';

/**
 * Given a set of test projects, checks that each project can synthesize the expected CloudFormation templates
 *
 * Test projects are configured in a file and the file name is passed to this script as the first and only argument
 *
 * Each test case contains the following:
 * 1. The path to a "project root" which should contain a project exactly as a customer would set it up
 * 2. The path to some expected CDK output. This should be the expected result of running `cdk synth` on the backend definition in the project root
 *
 * All paths in the config file are expected to be relative to the config file itself
 *
 * The shape of the config file is
 * {
 *     "cases": [
 *         {
 *             "testRoot": "<relative path>",
 *             "expectedCdkOut": "<relative path>"
 *         }
 *     ]
 * }
 *
 * The runner will run npm install and cdk synth within the backend directory of the testRoot
 * Then it will check that cdk.out matches expectedCdkOut
 */

const main = async () => {
  let configFilePath = process.argv[2];
  if (typeof configFilePath !== 'string') {
    throw new Error(
      'Pass a valid config file path as the first and only argument to the script'
    );
  }
  if (!path.isAbsolute(configFilePath)) {
    configFilePath = path.resolve(process.cwd(), configFilePath);
  }
  if (!(await fs.exists(configFilePath))) {
    throw new Error(
      'Pass a valid config file path as the first and only argument to the script'
    );
  }
  const basePath = path.dirname(configFilePath);

  const isPath = async (strPath) =>
    await fs.exists(path.resolve(basePath, strPath));

  const testCaseSchema = z.object({
    testRoot: z.string().refine(isPath, 'String must be a path'),
    expectedCdkOut: z.string().refine(isPath, 'String must be a path'),
  });

  type TestCase = z.infer<typeof testCaseSchema>;

  const configSchema = z.object({
    cases: z.array(testCaseSchema),
  });

  const config = await configSchema.parseAsync(
    JSON.parse(await fs.readFile(configFilePath, 'utf-8'))
  );

  const validateTestCase = async (basePath: string, testCase: TestCase) => {
    const testCaseRoot = path.resolve(basePath, testCase.testRoot);
    console.log(`Running tests in ${testCaseRoot}`);
    const backendRoot = path.resolve(testCaseRoot, 'backend');
    console.log(`Installing dependencies`);
    await execa('npm', ['install'], {
      cwd: backendRoot,
      shell: 'bash',
      stdio: 'inherit',
    });
    console.log(`Running cdk synth`);
    await execa(
      'npx',
      [
        'cdk',
        'synth',
        '--app',
        "'tsx index.ts'",
        '--context',
        'project-name=testProject',
        '--context',
        'environment-name=testEnvironment',
      ],
      {
        cwd: backendRoot,
        shell: 'bash',
        stdio: 'inherit',
      }
    );

    const actualSynthDir = path.resolve(backendRoot, 'cdk.out');
    const expectedOutputDir = path.resolve(basePath, testCase.expectedCdkOut);
    console.log(
      `Comparing ${actualSynthDir} to expected contents in ${expectedOutputDir}`
    );
    const compareResult = await dirCompare.compare(
      actualSynthDir,
      expectedOutputDir,
      {
        compareContent: true,
      }
    );
    if (!compareResult.same) {
      compareResult.diffSet
        .filter((diff) => diff.state !== 'equal')
        .forEach((diff) => {
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
              execaSync('diff', [diff.path1, diff.path2], { stdio: 'inherit' });
              break;
            default:
              throw new Error(`Unexpected diff state ${diff.state}`);
          }
        });
      throw new Error('CDK output did not match expected shape');
    }
    console.log('CDK output validation passed');
  };

  const validationPromises = config.cases.map((testCase) =>
    validateTestCase(basePath, testCase)
  );
  await Promise.all(validationPromises);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
