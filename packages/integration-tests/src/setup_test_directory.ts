import { existsSync } from 'fs';
import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Root test directory.
 */
export const rootTestDir = fileURLToPath(
  new URL('./e2e-tests', import.meta.url)
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
