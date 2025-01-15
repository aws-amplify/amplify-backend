import { ESLintUtils } from '@typescript-eslint/utils';

export const propagateErrorCause = ESLintUtils.RuleCreator.withoutDocs({
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
            if (node.arguments && node.arguments.length < 3) {
              context.report({
                node,
                messageId: 'noCausePropagation',
              });
            }
          }
        };
        checkNode('AmplifyFault');
        checkNode('AmplifyUserError');
      },
    };
  },
  meta: {
    docs: {
      description:
        'The underlying error must be displayed as a cause for errors we wrap in Amplify Error logic',
    },
    messages: {
      noCausePropagation:
        'Wrapped errors must have cause propagation, add the underlying error message as the cause property',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
});
