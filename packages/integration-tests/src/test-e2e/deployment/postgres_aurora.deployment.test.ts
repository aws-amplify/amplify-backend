import { TestProjectCreator } from '../../test-project-setup/test_project_creator.js';
import { defineDeploymentTest } from './deployment.test.template.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

class PostgresAuroraTestProjectCreator implements TestProjectCreator {
  readonly name = 'postgres-aurora';

  async createProject(e2eProjectDir: string): Promise<TestProjectBase> {
    const projectRoot = path.join(
      dirname,
      '..',
      '..',
      'test-projects',
      'postgres-aurora',
    );
    return new TestProjectBase(projectRoot, e2eProjectDir);
  }
}

defineDeploymentTest(new PostgresAuroraTestProjectCreator());
