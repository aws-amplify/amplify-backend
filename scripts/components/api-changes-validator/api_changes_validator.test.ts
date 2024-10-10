import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fsp from 'fs/promises';
import { existsSync } from 'fs';
import { ApiChangesValidator } from './api_changes_validator.js';
import { execa } from 'execa';
import { EOL } from 'os';

const testResourcesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'test-resources'
);
const testProjectsWithBreaksPath = path.join(
  testResourcesPath,
  'test-projects',
  'with-breaks'
);
const testProjectsWithBreaks = await fsp.readdir(testProjectsWithBreaksPath);
const testProjectsWithoutBreaksPath = path.join(
  testResourcesPath,
  'test-projects',
  'without-breaks'
);
const testProjectsWithoutBreaks = await fsp.readdir(
  testProjectsWithoutBreaksPath
);
const workingDirectory = path.join(testResourcesPath, 'working-directory');

void describe('Api changes validator', { concurrency: true }, () => {
  before(async () => {
    if (existsSync(workingDirectory)) {
      await fsp.rm(workingDirectory, { recursive: true, force: true });
    }
    await fsp.mkdir(workingDirectory);
  });

  after(async () => {
    await fsp.rm(workingDirectory, { recursive: true, force: true });
  });

  for (const testProject of testProjectsWithBreaks) {
    void it(`detects break in project ${testProject}`, async () => {
      const latestPackagePath = path.join(
        testProjectsWithBreaksPath,
        testProject
      );
      const expectedErrorMessage = (
        await fsp.readFile(
          path.join(latestPackagePath, 'expected-error-message.txt'),
          'utf-8'
        )
      ).trim();
      await execa('npx', ['tsc', '--build'], { cwd: latestPackagePath });
      const baselinePackageApiReportPath = path.join(
        latestPackagePath,
        'API.md'
      );
      const validator = new ApiChangesValidator(
        latestPackagePath,
        baselinePackageApiReportPath,
        workingDirectory,
        [],
        'npmLocalLink'
      );

      await assert.rejects(
        () => validator.validate(),
        (error: Error) => {
          assert.ok(
            error.message.includes(expectedErrorMessage),
            `Error message ${EOL}${error.message}${EOL} must contain ${EOL}${expectedErrorMessage}${EOL}`
          );
          return true;
        }
      );
    });
  }

  for (const testProject of testProjectsWithoutBreaks) {
    void it(`passes for project ${testProject}`, async () => {
      const latestPackagePath = path.join(
        testProjectsWithoutBreaksPath,
        testProject
      );
      await execa('npx', ['tsc', '--build'], { cwd: latestPackagePath });
      const baselinePackageApiReportPath = path.join(
        latestPackagePath,
        'API.md'
      );
      const validator = new ApiChangesValidator(
        latestPackagePath,
        baselinePackageApiReportPath,
        workingDirectory,
        ['SampleIgnoredType'],
        'npmLocalLink'
      );

      // expect successful execution
      await validator.validate();
    });
  }
});
