import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * This rule flags empty catch blocks. Even if they contain comments.
 *
 * This rule differs from built in https://github.com/eslint/eslint/blob/main/lib/rules/no-empty.js
 * in such a way that it uses typescript-eslint and typescript AST
 * which does not include comments as statements in catch clause body block.
 */
export const rule = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      CatchClause(node) {
        if (node.body.body.length === 0) {
          context.report({
            messageId: 'noEmptyCatch',
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: 'Catch block should contain error-handling logic.',
    },
    messages: {
      noEmptyCatch: 'Catch block must not be empty.',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});
