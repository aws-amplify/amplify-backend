import path from 'path';
import { existsSync } from 'fs';
import fsp from 'fs/promises';
import { execa } from 'execa';
import { IndexFileRenderer } from './index_file_renderer.js';
import { TypesUsageGenerator } from './types_usage_generator.js';

/**
 * Validates changes between two versions of a package.
 *
 * Based on https://stackoverflow.com/questions/71616063/detect-breaking-changes-in-typescript/71618156#71618156.
 */
export class ApiChangesValidator {
  private readonly baselinePackageApiReportPath: string;
  private readonly latestPackageApiReportPath: string;
  private readonly projectPath: string;
  /**
   * creates api changes validator
   */
  constructor(
    private readonly packageName: string,
    private readonly baselinePackagePath: string,
    private readonly latestPackagePath: string,
    private readonly workingDirectory: string
  ) {
    this.baselinePackageApiReportPath = path.join(
      baselinePackagePath,
      'API.md'
    );
    if (!existsSync(this.baselinePackageApiReportPath)) {
      throw new Error(`${baselinePackagePath} does not have API.md report`);
    }
    this.latestPackageApiReportPath = path.join(latestPackagePath, 'API.md');
    if (!existsSync(this.latestPackageApiReportPath)) {
      throw new Error(`${latestPackagePath} does not have API.md report`);
    }
    this.projectPath = path.join(workingDirectory, this.packageName);
  }

  validate = async (): Promise<void> => {
    await fsp.rm(this.projectPath, { recursive: true, force: true });
    await fsp.mkdir(this.projectPath, { recursive: true });
    await this.createTestProject();
    await execa('npx', ['tsc', '--build'], {
      cwd: this.projectPath,
      stdio: 'inherit',
    });
  };

  private createTestProject = async () => {
    const dependencies: Record<string, string> = {};
    dependencies[
      `${this.packageName}-baseline`
    ] = `file://${this.baselinePackagePath}`;
    dependencies[
      `${this.packageName}-latest`
    ] = `file://${this.latestPackagePath}`;
    dependencies['typescript'] = '^5.0.0';

    // Add latest dependencies and peer dependencies as public API might use them
    const latestPackageJsonContent = await fsp.readFile(
      path.join(this.latestPackagePath, 'package.json'),
      'utf-8'
    );
    const latestPackageJson = JSON.parse(latestPackageJsonContent);
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
      name: `api-changes-validation-${this.packageName}`,
      type: 'module',
      dependencies,
    };
    await fsp.writeFile(
      path.join(this.projectPath, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2)
    );
    await execa('npm', ['install'], { cwd: this.projectPath });
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
    await execa('npx', tscArgs, { cwd: this.projectPath });
    await new TypesUsageGenerator(
      path.join(this.projectPath, 'latest_types_usage.ts'),
      this.packageName,
      `${this.packageName}-latest`,
      this.latestPackageApiReportPath
    ).generate();
    await new TypesUsageGenerator(
      path.join(this.projectPath, 'baseline_types_usage.ts'),
      this.packageName,
      `${this.packageName}-baseline`,
      this.baselinePackageApiReportPath
    ).generate();
    await new IndexFileRenderer(
      this.projectPath,
      './latest_types_usage.js',
      './baseline_types_usage.js'
    ).render();
  };
}
