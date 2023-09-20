// Recommended plugins that we extend as is
import js_plugin from '@eslint/js';
import prettierRecommended from 'eslint-config-prettier';
import typescriptParser from '@typescript-eslint/parser';

// Plugins that we configure
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';
import jsdoc from 'eslint-plugin-jsdoc';
import importPlugin from 'eslint-plugin-import';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import * as checkFile from 'eslint-plugin-check-file';
import spellCheck from 'eslint-plugin-spellcheck';
import promise from 'eslint-plugin-promise';
import shopify from '@shopify/eslint-plugin';

import dictionary from './.eslint-dictionary.json' assert { type: 'json' };

export default [
  js_plugin.configs.recommended,
  jsdoc.configs['flat/recommended-typescript-error'],
  {
    languageOptions: {
      files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
      parser: typescriptParser,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { modules: true },
        ecmaVersion: 'latest',
        project: './tsconfig.json',
      },
    },
  },
  // {
  //   ignores: [
  //     'build',
  //     'coverage',
  //     'bin',
  //     'lib',
  //     'docs',
  //     'temp',
  //     'API.md',
  //     'examples',
  //     'verdaccio-cache',
  //   ],
  // },
  {
    rules: {
      ...prettierRecommended.rules,
      'no-console': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'error',
      'no-tabs': 'error',
      'no-throw-literal': 'error',
      'no-useless-catch': 'error',
      'prefer-promise-reject-errors': 'error',
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
      'no-restricted-syntax': [
        'error',
        'MethodDefinition[kind!=/[constructor|get]/]',
        'FunctionDeclaration',
        'VariableDeclarator > FunctionExpression',
      ],
    },
  },
  // Plugin specific rules in each configuration object
  {
    plugins: {
      typescript: typescriptPlugin,
      rules: {
        ...typescriptPlugin.rules,
        'typescript/naming-convention': [
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
        'typescript/method-signature-style': 'error',
        'typescript/switch-exhaustiveness-check': 'error',
        'typescript/no-floating-promises': 'error',
        'typescript/no-misused-promises': 'error',
        'typescript/parameter-properties': [
          'error',
          {
            prefer: 'parameter-property',
          },
        ],
        '@typescript/restrict-template-expressions': 'error',
        '@typescript/consistent-type-definitions': ['error', 'type'],
      },
    },
  },
  {
    plugins: {
      shopify,
    },
    rules: {
      'shopify/prefer-early-return': 'error',
    },
  },
  {
    plugins: {
      checkFile,
    },
    rules: {
      'checkFile/filename-blocklist': [
        'error',
        {
          '**/*util*': '**/*(!util)*/*(!util)*',
          '**/*util*/**': '**/*(!util)*/*(!util)*',
          '**/*helper*': '**/*(!helper)*/*(!helper)*',
          '**/*helper*/**': '**/*(!helper)*/*(!helper)*',
        },
      ],
      'checkFile/filename-naming-convention': [
        'error',
        {
          '**/*.{js,jsx,ts,tsx}': 'SNAKE_CASE',
          '**/*.{json}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'checkFile/folder-naming-convention': [
        'error',
        {
          '**': 'KEBAB_CASE',
        },
      ],
    },
  },
  {
    plugins: { noOnlyTests },
    rules: { 'noOnlyTests/no-only-tests': 'error' },
  },
  {
    plugins: { promise },
    rules: {
      ...promise.configs.recommended.rules,
      'promise/prefer-await-to-then': 'error',
    },
  },
  {
    plugins: { importPlugin },
    rules: { 'importPlugin/no-extraneous-dependencies': 'error' },
  },
  {
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            snakeCase: true,
          },
        },
      ],
    },
  },
  {
    plugins: { jsdoc },
    rules: {
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
      'jsdoc/require-returns': 'off',
    },
  },
  {
    plugins: { spellCheck },
    rules: {
      'spellCheck/spell-checker': [
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
  },
];
