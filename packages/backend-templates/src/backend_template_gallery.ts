import { BackendTemplate, BackendTemplateGallery } from './types.js';
import fs from 'fs/promises';

/**
 * A backend gallery that uses templates from local directory.
 */
export class LocalDirectoryBackendTemplateGallery
  implements BackendTemplateGallery
{
  /**
   * Creates backend template gallery.
   */
  constructor(private readonly templatesDirectory: string) {}

  /**
   * Lists available local templates.
   */
  async listBackendTemplates(): Promise<Array<BackendTemplate>> {
    const templates = (
      await fs.readdir(this.templatesDirectory, {
        withFileTypes: true,
      })
    )
      .filter((dirEntry) => dirEntry.isDirectory())
      .map((dirEntry) => ({
        name: dirEntry.name,
      }));
    return templates;
  }
}
