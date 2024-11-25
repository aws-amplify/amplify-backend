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
      | 'npmLocalLink' = 'npmRegistry'
  ) {
    this.latestPackageDirectoryName = path.basename(latestPackagePath);
    this.testProjectPath = path.join(
      workingDirectory,
      this.latestPackageDirectoryName
    );
  }

  validate = async (): Promise<void> => {
    await fsp.rm(this.testProjectPath, { recursive: true, force: true });
    await fsp.mkdir(this.testProjectPath, { recursive: true });
    const latestPackageJson = await readPackageJson(this.latestPackagePath);
    if (latestPackageJson.private) {
      console.log(
        `Skipping ${latestPackageJson.name} because it's private and not published to NPM`
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
        } failed, compiler output:${EOL}${compilationResult.all ?? ''}`
      );
    }
  };

  private createTestProject = async (latestPackageJson: PackageJson) => {
    const dependencies: Record<string, string> = {};
    if (this.latestPackageDependencyDeclarationStrategy === 'npmRegistry') {
      dependencies[latestPackageJson.name] = latestPackageJson.version;
    }
    dependencies['typescript'] = '^5.0.0';
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
        latestPackageJson.peerDependencies
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
      'utf-8'
    );
    const apiReportAST = ApiReportParser.parse(apiReportContent);
    const usage = new ApiUsageGenerator(
      latestPackageJson.name,
      apiReportAST,
      this.excludedTypes
    ).generate();
    await fsp.writeFile(path.join(this.testProjectPath, 'index.ts'), usage);
    await execa('npm', ['install'], { cwd: this.testProjectPath });
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
      '--target',
      'es2022',
      '--noEmit',
    ];
    await execa('npx', tscArgs, { cwd: this.testProjectPath });
  };
}
