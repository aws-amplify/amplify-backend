import { TestCdkProjectBase } from './test_cdk_project_base.js';
import { fileURLToPath } from 'node:url';
import path from 'path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const testCdkProjectsSourceRoot = path.resolve(
  dirname,
  '..',
  '..',
  '..',
  'src',
  'test-cdk-projects'
);

export type TestCdkProjectCreator = {
  readonly name: string;
  createProject: (e2eProjectDir: string) => Promise<TestCdkProjectBase>;
};
