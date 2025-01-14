const dictionary = require('./.eslint_dictionary.json');
module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:amplify-backend-rules/recommended',
    'plugin:jsdoc/recommended-typescript-error',
    'plugin:promise/recommended',
    'prettier',
  ],
  overrides: [
    {
      // Add files to this list that shouldn't be spellchecked
      files: ['.eslintrc.js'],
      rules: {
        'spellcheck/spell-checker': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['**/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'amplify-backend-rules',
    'unicorn',
    'jsdoc',
    'import',
    'no-only-tests',
    'check-file',
    'spellcheck',
    'promise',
    '@shopify',
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      {
        selector: 'objectLiteralProperty',
        format: null,
      },
      {
        selector: 'variable',
        modifiers: ['const', 'global'],
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
      },
    ],
    '@typescript-eslint/method-signature-style': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/parameter-properties': [
      'error',
      {
        prefer: 'parameter-property',
      },
    ],
    '@typescript-eslint/restrict-template-expressions': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/member-ordering': 'error',
    '@shopify/prefer-early-return': 'error',
    'check-file/filename-blocklist': [
      'error',
      {
        '**/*util*': '**/*(!util)*/*(!util)*',
        '**/*util*/**': '**/*(!util)*/*(!util)*',
        '**/*helper*': '**/*(!helper)*/*(!helper)*',
        '**/*helper*/**': '**/*(!helper)*/*(!helper)*',
      },
    ],
    'check-file/filename-naming-convention': [
      'error',
      {
        '**/*.{js,jsx,ts,tsx}': 'SNAKE_CASE',
        '**/*.{json}': 'KEBAB_CASE',
      },
      {
        ignoreMiddleExtensions: true,
      },
    ],
    'check-file/folder-naming-convention': [
      'error',
      {
        '**': 'KEBAB_CASE',
      },
    ],
    'no-console': 'error',
    'no-duplicate-imports': 'error',
    'no-else-return': 'error',
    'no-only-tests/no-only-tests': 'error',
    'no-tabs': 'error',
    'no-throw-literal': 'error',
    'no-useless-catch': 'error',
    'prefer-promise-reject-errors': 'error',
    'promise/prefer-await-to-then': 'error',
    'import/no-extraneous-dependencies': 'error',
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
      },
    ],
    'unicorn/filename-case': [
      'error',
      {
        cases: {
          snakeCase: true,
        },
      },
    ],
    'no-restricted-syntax': [
      'error',
      'MethodDefinition[kind!=/[constructor|get]/]',
      'FunctionDeclaration',
      'VariableDeclarator > FunctionExpression',
      {
        selector: 'MethodDefinition[static=true]',
        message: 'Static methods are not allowed in classes.',
      },
    ],
    'jsdoc/require-description': 'error',
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true,
        },
      },
    ],
    'jsdoc/require-param': 'off',
    'jsdoc/require-yields': 'off',
    'jsdoc/require-returns': 'off',
    'spellcheck/spell-checker': [
      'warn',
      {
        lang: 'en_US',
        skipWords: dictionary,
        skipIfMatch: [
          'http://[^s]*',
          '^[-\\w]+/[-\\w\\.]+$', //For MIME Types
        ],
        minLength: 4,
      },
    ],
  },
};
