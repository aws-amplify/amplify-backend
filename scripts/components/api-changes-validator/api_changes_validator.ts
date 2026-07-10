import path from 'path';
import fsp from 'fs/promises';
import { execa } from 'execa';
import { ApiUsageGenerator } from './api_usage_generator.js';
import { EOL } from 'os';
import { ApiReportParser } from './api_report_parser.js';
import {
  PackageJson,
  readPackageJson,
  writePackageJson,
} from '../package-json/package_json.js';

/**
 * Validates changes between two versions of a package.
 *
 * The validation procedure involves:
 * 1. Test TypeScript project is created
 * 2. Test project depends on latest version of package under test and it's dependencies and peer dependencies
 * 3. Usage snippets are generated in test project using baseline API.md file (this should come from version we compare to)
 * 4. Test project is compiled to detect potential breaks.
 */
export class ApiChangesValidator {
  private readonly testProjectPath: string;
  private readonly latestPackageDirectoryName: string;

  /**
   * creates api changes validator
   */
  constructor(
    private readonly latestPackagePath: string,
    private readonly baselinePackageApiReportPath: string,
    private readonly workingDirectory: string,
    private readonly excludedTypes: Array<string> = [],
    private readonly latestPackageDependencyDeclarationStrategy:
      | 'npmRegistry'
      | 'npmLocalLink' = 'npmRegistry',
  ) {
    this.latestPackageDirectoryName = path.basename(latestPackagePath);
    this.testProjectPath = path.join(
      workingDirectory,
      this.latestPackageDirectoryName,
    );
  }

  validate = async (): Promise<void> => {
    await this.removeDirWithRetry(this.testProjectPath);
    await fsp.mkdir(this.testProjectPath, { recursive: true });
    const latestPackageJson = await readPackageJson(this.latestPackagePath);
    if (latestPackageJson.private) {
      console.log(
        `Skipping ${latestPackageJson.name} because it's private and not published to NPM`,
      );
      return;
    }
    await this.createTestProject(latestPackageJson);
    const compilationResult = await execa('npx', ['tsc', '--build'], {
      cwd: this.testProjectPath,
      all: true,
      reject: false,
    });
    if (compilationResult.exitCode !== 0) {
      throw new Error(
        `Validation of ${
          latestPackageJson.name
        } failed, compiler output:${EOL}${compilationResult.all ?? ''}`,
      );
    }
  };

  private createTestProject = async (latestPackageJson: PackageJson) => {
    const dependencies: Record<string, string> = {};
    if (this.latestPackageDependencyDeclarationStrategy === 'npmRegistry') {
      dependencies[latestPackageJson.name] = latestPackageJson.version;
    }
    dependencies['typescript'] = '5.9.x';
    dependencies['@types/node'] = '^18.15.11';
    // Add the latest dependencies and peer dependencies as public API might use them
    if (latestPackageJson.dependencies) {
      for (const dependencyKey of Object.keys(latestPackageJson.dependencies)) {
        dependencies[dependencyKey] =
          latestPackageJson.dependencies[dependencyKey];
      }
    }
    if (latestPackageJson.peerDependencies) {
      for (const dependencyKey of Object.keys(
        latestPackageJson.peerDependencies,
      )) {
        dependencies[dependencyKey] =
          latestPackageJson.peerDependencies[dependencyKey];
      }
    }

    const packageJsonContent = {
      name: `api-changes-validation-${this.latestPackageDirectoryName}`,
      version: '1.0.0',
      type: 'module',
      dependencies,
    };
    await writePackageJson(this.testProjectPath, packageJsonContent);
    const apiReportContent = await fsp.readFile(
      this.baselinePackageApiReportPath,
      'utf-8',
    );
    const apiReportAST = ApiReportParser.parse(apiReportContent);
    const usage = new ApiUsageGenerator(
      latestPackageJson.name,
      apiReportAST,
      this.excludedTypes,
    ).generate();
    await fsp.writeFile(path.join(this.testProjectPath, 'index.ts'), usage);
    // check_api_changes installs one throwaway project PER workspace package
    // (~27) in parallel, each pulling the full amplify dependency graph from the
    // local proxy. Two problems this addresses:
    //  - `--no-audit --no-fund --prefer-offline`: the audit/funding round-trips
    //    and metadata re-resolution add no value here (we only need the types to
    //    compile) but cost time.
    //  - `--fetch-retries` / `--fetch-timeout`: with ~27 installs hammering the
    //    proxy in parallel, a single transient `ECONNRESET`/aborted fetch on ANY
    //    one package rejects its Promise, which fails the whole aggregate job and
    //    forces a full 27-package retry. npm's built-in fetch retry (with
    //    backoff) absorbs those blips at the package level instead.
    await execa(
      'npm',
      [
        'install',
        '--no-audit',
        '--no-fund',
        '--prefer-dedupe',
        '--prefer-offline',
        '--fetch-retries=5',
        '--fetch-retry-factor=2',
        '--fetch-retry-mintimeout=2000',
        '--fetch-retry-maxtimeout=60000',
        '--fetch-timeout=300000',
      ],
      { cwd: this.testProjectPath },
    );
    if (this.latestPackageDependencyDeclarationStrategy === 'npmLocalLink') {
      await execa('npm', ['link', this.latestPackagePath], {
        cwd: this.testProjectPath,
      });
    }
    const tscArgs = [
      'tsc',
      '--init',
      '--resolveJsonModule',
      'true',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--types',
      'node',
      '--target',
      'es2022',
      '--noEmit',
      '--verbatimModuleSyntax',
      'false',
      '--exactOptionalPropertyTypes', // 2025-09-22: this is kind of bad, but our types are currently not set up for it to be enabled
      'false',
    ];
    await execa('npx', tscArgs, { cwd: this.testProjectPath });
  };

  /**
   * Recursively remove a directory, retrying on transient errors.
   *
   * Node's recursive `fs.rm` can throw `ENOTEMPTY` (and occasionally `EBUSY`)
   * when several large `node_modules` trees are removed concurrently — each
   * package is validated in parallel (`Promise.allSettled`), so the deletes
   * race with each other and with lingering FS handles. `force: true`
   * suppresses "not found" but NOT `ENOTEMPTY`, so a bare `fs.rm` intermittently
   * fails the whole check during teardown even though every API validation
   * itself succeeded. Retry a few times, pausing between tries, before failing.
   */
  private removeDirWithRetry = async (
    dir: string,
    attempts = 5,
  ): Promise<void> => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await fsp.rm(dir, { recursive: true, force: true });
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (
          attempt === attempts ||
          (code !== 'ENOTEMPTY' && code !== 'EBUSY' && code !== 'EPERM')
        ) {
          throw error;
        }
        // brief pause to let concurrent deletes / lingering handles settle
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  };
}
