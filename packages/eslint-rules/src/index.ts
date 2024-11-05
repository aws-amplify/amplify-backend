import { noEmptyCatchRule } from './rules/no_empty_catch.js';
import { amplifyErrorNameRule } from './rules/amplify_error_name.js';
import { preferAmplifyErrorsRule } from './rules/prefer_amplify_errors.js';
import { noAmplifyErrors } from './rules/no_amplify_errors.js';
import { amplifyErrorNoInstanceOf } from './rules/amplify_error_no_instance_of';

export const rules: Record<string, unknown> = {
  'amplify-error-name': amplifyErrorNameRule,
  'amplify-error-no-instanceof': amplifyErrorNoInstanceOf,
  'no-empty-catch': noEmptyCatchRule,
  'prefer-amplify-errors': preferAmplifyErrorsRule,
  'no-amplify-errors': noAmplifyErrors,
};

export const configs = {
  recommended: {
    plugins: ['amplify-backend-rules'],
    rules: {
      'amplify-backend-rules/amplify-error-name': 'error',
      'amplify-backend-rules/amplify-error-no-instanceof': 'error',
      'amplify-backend-rules/no-empty-catch': 'error',
      'amplify-backend-rules/prefer-amplify-errors': 'off',
      'amplify-backend-rules/no-amplify-errors': 'off',
    },
    overrides: [
      {
        files: [
          'packages/sandbox/src/**',
          'packages/backend-ai/src/**',
          'packages/backend-auth/src/**',
          'packages/backend-deployer/src/**',
          'packages/create-amplify/src/**',
          'packages/form-generator/src/**',
          'packages/model-generator/src/**',
          'packages/schema-generator/src/**',
        ],
        excludedFiles: ['**/*.test.ts'],
        rules: {
          'amplify-backend-rules/prefer-amplify-errors': 'error',
        },
      },
      {
        files: [
          'packages/auth-construct/src/**',
          'packages/ai-constructs/src/**',
          'packages/backend-output-storage/src/**',
          'packages/deployed-backend-client/src/**',
        ],
        rules: {
          'amplify-backend-rules/no-amplify-errors': 'error',
        },
      },
    ],
  },
};
