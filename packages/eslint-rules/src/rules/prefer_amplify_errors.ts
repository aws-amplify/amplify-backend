import { ESLintUtils } from '@typescript-eslint/utils';

export const preferAmplifyErrorsRule = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      NewExpression(node) {
        const checkNode = (errorType: string) => {
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === errorType
          ) {
            context.report({
              messageId: 'useOfErrorDetected',
              node,
            });
          }
        };
        checkNode('Error');
      },
    };
  },
  meta: {
    docs: {
      description: 'Error base class should not be used in certain packages',
    },
    messages: {
      useOfErrorDetected:
        'AmplifyUserError or AmplifyFault should be used instead of Error base class',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});