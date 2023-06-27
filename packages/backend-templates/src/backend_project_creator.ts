import { BackendProjectCreator } from './types.js';
import * as fsExtra from 'fs-extra';
import fs from 'fs/promises';
import path from 'path';

/**
 * Creates a backend project using a template available in local directory.
 */
export class LocalDirectoryBackendProjectCreator
  implements BackendProjectCreator
{
  /**
   * Creates backend project creator.
   * @param templatesDirectory A local directory that contains available templates.
   */
  constructor(private readonly templatesDirectory: string) {}

  /**
   * @inheritDoc
   */
  async createFromTemplate(
    templateName: string,
    destinationDirectory: string
  ): Promise<void> {
    if (!(await fsExtra.exists(destinationDirectory))) {
      throw new Error('Target directory does not exists');
    }
    if (!(await fs.stat(destinationDirectory)).isDirectory()) {
      throw new Error('Target directory is not a directory');
    }
    if ((await fs.readdir(destinationDirectory)).length !== 0) {
      throw new Error('Target directory is not empty');
    }
    const templateDirectory = path.join(this.templatesDirectory, templateName);

    if (!(await fsExtra.exists(templateDirectory))) {
      throw new Error(`Template ${templateName} does not exist`);
    }

    await fsExtra.copy(templateDirectory, destinationDirectory);
  }
}
