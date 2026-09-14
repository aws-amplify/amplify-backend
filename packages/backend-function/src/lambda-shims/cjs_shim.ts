import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
global.require = createRequire(import.meta.url);
global.__filename = url.fileURLToPath(import.meta.url);
global.__dirname = path.dirname(__filename);
