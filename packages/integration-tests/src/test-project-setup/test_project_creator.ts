import { TestProjectBase } from './test_project_base.js';

export type TestProjectCreator = {
  readonly name: string;
  createProject: (e2eProjectDir: string) => Promise<TestProjectBase>;
};

/**
 * Generates a list of test projects.
 */
export const getTestProjectCreators = (): TestProjectCreator[] => {
  const testProjectCreators: TestProjectCreator[] = [];
  return testProjectCreators;
};
