import { rule } from './rules/no_empty_catch.js';

export const rules: Record<string, unknown> = {
  'no-empty-catch': rule,
};

export const configs = {
  recommended: {
    plugins: ['amplify-backend-rules'],
    rules: {
      'amplify-backend-rules/no-empty-catch': 'error',
    },
  },
};
