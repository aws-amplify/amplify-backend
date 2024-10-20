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
  if (process.env.CI) {
    // We don't have to delete test directories in CI.
    // The VMs are ephemeral.
    // On the other hand we want to keep shared parent directories for test projects
    // for tests executing in parallel on the same VM.
    return;
  }
  if (existsSync(pathName)) {
    await fs.rm(pathName, { recursive: true, force: true });
  }
};
