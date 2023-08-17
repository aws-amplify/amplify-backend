import { describe, it } from 'node:test';
import { NoAmplifyDirValidator } from './no_amplify_dir_validator.js';
import assert from 'assert';

describe('NoAmplifyDirValidator', async () => {
  it('throws if test path already exists', async () => {
    const noAmplifyDirValidator = new NoAmplifyDirValidator(
      'testRoot',
      () => true
    );
    await assert.rejects(noAmplifyDirValidator.validate);
  });

  it('does nothing if test path does not exist', async () => {
    const noAmplifyDirValidator = new NoAmplifyDirValidator(
      'testRoot',
      () => false
    );
    await noAmplifyDirValidator.validate();
    // getting here means validation passed
  });
});
