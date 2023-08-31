import { describe, it } from 'node:test';
import { ProjectRootValidator } from './project_root_validator.js';
import assert from 'assert';

describe('NoAmplifyDirValidator', () => {
  it('throws if test path already exists', async () => {
    const noAmplifyDirValidator = new ProjectRootValidator(
      'testRoot',
      () => true
    );
    await assert.rejects(noAmplifyDirValidator.validate);
  });

  it('does nothing if test path does not exist', async () => {
    const noAmplifyDirValidator = new ProjectRootValidator(
      'testRoot',
      () => false
    );
    await noAmplifyDirValidator.validate();
    // getting here means validation passed
  });
});
