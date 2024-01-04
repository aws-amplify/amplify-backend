import { existsSync } from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import * as os from 'os';

/**
 * Root test directory.
 */
export const rootTestDir = path.join(os.tmpdir(), 'e2e-tests');

/**
 * Creates a test directory.
 */
export const createTestDirectory = async (pathName: string | URL) => {
  if (!existsSync(pathName)) {
    await fsp.mkdir(pathName, { recursive: true });
  }
};

/**
 * Delete a test directory.
 */
export const deleteTestDirectory = async (pathName: string | URL) => {
  if (existsSync(pathName)) {
    await fsp.rm(pathName, { recursive: true, force: true });
  }
};
