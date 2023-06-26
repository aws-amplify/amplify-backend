import { BackendProjectCreator } from './types.js';
import * as fsExtra from 'fs-extra';
import fs from 'fs/promises';
import path from 'path';

/**
 * Creates a backend project using a template available locally.
 */
export class LocalDirectoryBackendProjectCreator
  implements BackendProjectCreator
{
  /**
   * Creates backend project creator.
   */
  constructor(private readonly templatesDirectory: string) {}

  /**
   * Creates a backend project using template.
   */
  async createFromTemplate(
    templateName: string,
    destinationDirectory: string
  ): Promise<void> {
    if (!(await fsExtra.exists(destinationDirectory))) {
      throw new Error('target directory does not exists');
    }
    if (!(await fs.stat(destinationDirectory)).isDirectory()) {
      throw new Error('target directory is not a directory');
    }
    if ((await fs.readdir(destinationDirectory)).length !== 0) {
      throw new Error('target directory is not empty');
    }
    const templateDirectory = path.join(this.templatesDirectory, templateName);

    await fsExtra.copy(templateDirectory, destinationDirectory);
  }
}
