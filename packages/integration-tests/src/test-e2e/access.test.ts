import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { NpmRegistryController } from '../npm_registry_controller.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

void describe('access tests', () => {
  const npmRegistryController = new NpmRegistryController(true);

  let projectDir1: string;
  let projectDir2: string;

  before(async () => {
    await npmRegistryController.setUp();
    projectDir1 = await fs.mkdtemp(
      path.join(os.tmpdir(), 'test-access-project1')
    );
    projectDir2 = await fs.mkdtemp(
      path.join(os.tmpdir(), 'test-access-project2')
    );
    console.log(projectDir1);
    console.log(projectDir2);
  });
  after(async () => {
    // await fs.rm(projectDir1, { recursive: true });
    // await fs.rm(projectDir2, { recursive: true });
    // await npmRegistryController.tearDown();
  });
});
