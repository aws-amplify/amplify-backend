import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * This rule flags empty catch blocks. Even if they contain comments.
 *
 * This rule differs from built in https://github.com/eslint/eslint/blob/main/lib/rules/no-empty.js
 * in such a way that it uses typescript-eslint and typescript AST
 * which does not include comments as statements in catch clause body block.
 */
export const amplifyErrorNoInstanceOf = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      BinaryExpression(node) {
        if (
          node.operator === 'instanceof' &&
          node.right.type === 'Identifier' &&
          node.right.name === 'AmplifyError'
        ) {
          context.report({
            messageId: 'noInstanceOfWithAmplifyError',
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: 'Instanceof operator must not be used with AmplifyError.',
    },
    messages: {
      noInstanceOfWithAmplifyError:
        'Do not use instanceof with AmplifyError. Use AmplifyError.isAmplifyError instead.',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});
