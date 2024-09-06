import { ESLintUtils } from '@typescript-eslint/utils';

export const noAmplifyErrors = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      NewExpression(node) {
        const checkNode = (
          errorType: string,
          messageId: 'useOfAmplifyErrorDetected' | 'useOfFaultDetected'
        ) => {
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === errorType
          ) {
            context.report({
              node,
              messageId,
            });
          }
        };
        checkNode('AmplifyFault', 'useOfFaultDetected');
        checkNode('AmplifyUserError', 'useOfAmplifyErrorDetected');
      },
    };
  },
  meta: {
    docs: {
      description:
        'AmplifyUserError and AmplifyFault should not be used in certain packages',
    },
    messages: {
      useOfAmplifyErrorDetected:
        'Error base class should be used instead of AmplifyUserError',
      useOfFaultDetected:
        'Error base class should be used instead of AmplifyFault',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});
