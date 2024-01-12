import { ESLintUtils } from '@typescript-eslint/utils';

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
      description: 'Catch block should contain error handling logic.',
    },
    messages: {
      noEmptyCatch: 'Catch block must not be empty.',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});
