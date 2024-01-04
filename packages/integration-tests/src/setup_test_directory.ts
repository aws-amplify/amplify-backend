import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';

/**
 * Root test directory.
 */
export const rootTestDir = path.resolve(
  fileURLToPath(new URL(`${os.tmpdir()}/e2e-tests`, import.meta.url))
);

/**
 * Creates a test directory.
 */
export const createTestDirectory = async (pathName: string | URL) => {
  if (!existsSync(pathName)) {
    await fs.mkdir(pathName, { recursive: true });
  }
};

/**
 * Delete a test directory.
 */
export const deleteTestDirectory = async (pathName: string | URL) => {
  if (existsSync(pathName)) {
    await fs.rm(pathName, { recursive: true, force: true });
  }
};
