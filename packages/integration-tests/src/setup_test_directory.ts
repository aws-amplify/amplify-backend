import { after, before } from 'node:test';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

export const getTestDir = fileURLToPath(
  new URL('./e2e-tests', import.meta.url)
);

/**
 * Registers before and after handlers to create a test dir at the beginning of a test suite and delete it at the end
 */
export const createTestDirectoryBeforeAndCleanupAfter = (
  pathName: string | URL
) => {
  before(async () => {
    if (!existsSync(pathName)) {
      await fs.mkdir(pathName, { recursive: true });
    }
  });

  after(async () => {
    await fs.rm(pathName, { recursive: true });
  });
};
