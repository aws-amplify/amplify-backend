import { noEmptyCatchRule } from './rules/no_empty_catch.js';
import { amplifyErrorNameRule } from './rules/amplify_error_name.js';

export const rules: Record<string, unknown> = {
  'amplify-error-name': amplifyErrorNameRule,
  'no-empty-catch': noEmptyCatchRule,
};

export const configs = {
  recommended: {
    plugins: ['amplify-backend-rules'],
    rules: {
      'amplify-backend-rules/amplify-error-name': 'error',
      'amplify-backend-rules/no-empty-catch': 'error',
    },
  },
};
