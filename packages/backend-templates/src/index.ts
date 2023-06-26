import * as path from 'path';
import * as url from 'url';

import { BackendProjectCreator, BackendTemplateGallery } from './types.js';
import { LocalDirectoryBackendTemplateGallery } from './backend_template_gallery.js';
import { LocalDirectoryBackendProjectCreator } from './backend_project_creator.js';

const templatesDirectory = path.resolve(
  url.fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'templates'
);

export const backendTemplateGallery: BackendTemplateGallery =
  new LocalDirectoryBackendTemplateGallery(templatesDirectory);

export const backendProjectCreator: BackendProjectCreator =
  new LocalDirectoryBackendProjectCreator(templatesDirectory);

export { BackendProjectCreator, BackendTemplateGallery };
