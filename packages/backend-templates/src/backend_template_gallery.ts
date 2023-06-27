import { BackendTemplate, BackendTemplateGallery } from './types.js';
import fs from 'fs/promises';

/**
 * A backend gallery that uses templates available in a local directory.
 */
export class LocalDirectoryBackendTemplateGallery
  implements BackendTemplateGallery
{
  /**
   * Creates backend template gallery.
   * @param templatesDirectory A local directory that contains available templates.
   */
  constructor(private readonly templatesDirectory: string) {}

  /**
   * @inheritDoc
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
