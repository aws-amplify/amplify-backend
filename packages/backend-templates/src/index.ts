import * as fs from 'fs/promises';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as url from 'url';

const templatesDirectory = path.resolve(
  url.fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'templates'
);

/**
 * A backend template.
 */
export type BackendTemplate = {
  readonly name: string;
};

/**
 * Lists available backend templates.
 */
export const listBackendTemplates = async (): Promise<
  Array<BackendTemplate>
> => {
  const templates = (
    await fs.readdir(templatesDirectory, {
      withFileTypes: true,
    })
  )
    .filter((dirEntry) => dirEntry.isDirectory())
    .map((dirEntry) => ({
      name: dirEntry.name,
    }));
  return templates;
};

/**
 * Creates backend project from a template.
 */
export const createBackendProjectFromTemplate = async (
  templateName: string,
  destinationDirectory: string
): Promise<void> => {
  if (!(await fsExtra.exists(destinationDirectory))) {
    throw new Error('target directory does not exists');
  }
  if (!(await fs.stat(destinationDirectory)).isDirectory()) {
    throw new Error('target directory is not a directory');
  }
  if ((await fs.readdir(destinationDirectory)).length !== 0) {
    throw new Error('target directory is not empty');
  }
  const templateDirectory = path.join(templatesDirectory, templateName);

  await fsExtra.copy(templateDirectory, destinationDirectory);

  console.log(templateName, destinationDirectory);
};
