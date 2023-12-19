import fs from 'fs';
import path from 'path';
import { execa as _execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';
import { InitialProjectFileGenerator } from '../initial_project_file_generator.js';

/**
 *
 */
export class YarnModernPackageManagerController extends PackageManagerController {
  /**
   * Abstraction around yarn modern commands that are needed to initialize a project and install dependencies
   */
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'yarn';
    this.binaryRunner = 'yarn';
    this.installCommand = 'add';
    this.initDefault = ['init', '--yes'];
  }

  /**
   * generateInitialProjectFiles
   */
  async generateInitialProjectFiles() {
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      this.projectRoot,
      this.addLockFile
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();
  }

  /**
   * addLockFile
   */
  private addLockFile(targetDir: string) {
    fs.writeFile(path.resolve(targetDir, 'yarn.lock'), '', (err) => {
      if (err) {
        console.error(`Error creating ${targetDir}/${targetDir}`, err);
      } else {
        console.log(`${targetDir}/yarn.lock created successfully.`);
      }
    });
  }
}
