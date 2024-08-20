import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * This rule flags Amplify errors and faults constructor calls that don't appropriate 'Error' or 'Fault' suffix.
 */
export const amplifyErrorNameRule = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      NewExpression(node) {
        const checkNode = (
          errorTypeName: string,
          expectedNameSuffix: string,
          messageId: 'properAmplifyErrorSuffix' | 'properAmplifyFaultSuffix'
        ) => {
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === errorTypeName
          ) {
            if (node.arguments && node.arguments.length > 0) {
              const nameArgument = node.arguments[0];
              if (
                nameArgument.type === 'Literal' &&
                nameArgument.value &&
                !nameArgument.value.toString().endsWith(expectedNameSuffix)
              ) {
                context.report({
                  messageId,
                  node,
                });
              }
            }
          }
        };
        checkNode('AmplifyUserError', 'Error', 'properAmplifyErrorSuffix');
        checkNode('AmplifyFault', 'Fault', 'properAmplifyFaultSuffix');
      },
    };
  },
  meta: {
    docs: {
      description: 'Amplify errors and faults must use proper name suffix',
    },
    messages: {
      properAmplifyErrorSuffix:
        'Amplify errors must use name with Error suffix',
      properAmplifyFaultSuffix:
        'Amplify faults must use name with Fault suffix',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});
