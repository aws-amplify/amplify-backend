import { describe, it, mock } from 'node:test';
import createAmplify from './create_amplify.js';
import { AmplifyPrompter } from './amplify_prompts.js';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import assert from 'assert';

mock.fn(AmplifyProjectCreator, () => {
  return {
    create: async () => Promise.resolve(),
  };
});
// const logMock = mock.fn();
// const packageManagerControllerMock = { installDependencies: mock.fn() };
// const projectRootValidatorMock = { validate: mock.fn() };
// const initialProjectFileGeneratorMock = {
//     generateInitialProjectFiles: mock.fn(),
// };
// const npmInitializedEnsurerMock = { ensureInitialized: mock.fn() };
// const tsConfigInitializerMock = { ensureInitialized: mock.fn() };
// const amplifyProjectCreator = new AmplifyProjectCreator(
//     packageManagerControllerMock as never,
//     projectRootValidatorMock as never,
//     initialProjectFileGeneratorMock as never,
//     npmInitializedEnsurerMock as never,
//     tsConfigInitializerMock as never,
//     { log: logMock } as never
// );

// suggestion from https://github.com/nodejs/help/issues/4220
// mock.method(AmplifyProjectCreator.prototype, 'create', async () => Promise.resolve());
mock.method(AmplifyPrompter, 'input', () => Promise.resolve('.'));

void describe('createAmplify', () => {
  void it('shows prompts', async (ctx) => {
    // ctx.mock.method(amplifyProjectCreator, 'create', async () => Promise.resolve());
    const result = await createAmplify();
    assert.ok(result);
  });
});

/**
 The test hangs and the output is:
 
    Validating current state of target directory...
    Installing packages aws-amplify@api-v6-models...
 
 */
