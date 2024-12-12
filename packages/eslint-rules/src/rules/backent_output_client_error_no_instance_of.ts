import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * This rule flags empty catch blocks. Even if they contain comments.
 *
 * This rule differs from built in https://github.com/eslint/eslint/blob/main/lib/rules/no-empty.js
 * in such a way that it uses typescript-eslint and typescript AST
 * which does not include comments as statements in catch clause body block.
 */
export const backendOutputClientErrorNoInstanceOf =
  ESLintUtils.RuleCreator.withoutDocs({
    create(context) {
      return {
        // This naming comes from @typescript-eslint/utils types.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        BinaryExpression(node) {
          if (
            node.operator === 'instanceof' &&
            node.right.type === 'Identifier' &&
            node.right.name === 'BackendOutputClientError'
          ) {
            context.report({
              messageId: 'noInstanceOfWithBackendOutputClientError',
              node,
            });
          }
        },
      };
    },
    meta: {
      docs: {
        description:
          'Instanceof operator must not be used with BackendOutputClientError.',
      },
      messages: {
        noInstanceOfWithBackendOutputClientError:
          'Do not use instanceof with BackendOutputClientError. Use BackendOutputClientError.isBackendOutputClientError instead.',
      },
      type: 'problem',
      schema: [],
    },
    defaultOptions: [],
  });
