import { ESLintUtils } from '@typescript-eslint/utils';

export const propagateErrorCause = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      CatchClause(node) {
        const checkNode = (errorType: string) => {
          if (
            node.param &&
            node.param.type === 'Identifier' &&
            !node.param.name
          ) {
            context.report({
              messageId: 'noCausePropagation',
              node,
            });
          } else if (
            node.param &&
            node.param.type === 'Identifier' &&
            node.param.name &&
            node.body.body.length &&
            node.body.body[0].type === 'ThrowStatement'
          ) {
            const body = node.body.body[0];
            if (
              body.argument &&
              //@ts-expect-error assumes incorrect type for body.argument
              body.argument?.type === 'NewExpression' &&
              //@ts-expect-error assumes incorrect type for body.argument
              body.argument.callee.name === errorType
            ) {
              if (errorType === 'Error') {
                // eslint-disable-next-line no-console
                console.log(node.param.name);
                //console.log(body.argument.arguments[0]);
              } else {
                //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                if (body.argument.arguments.length < 3) {
                  context.report({
                    messageId: 'noCausePropagation',
                    node,
                  });
                } else {
                  //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                  if (body.argument.arguments[2].consequent) {
                    if (
                      //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      body.argument.arguments[2].consequent.name &&
                      //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      body.argument.arguments[2].consequent.name !==
                        node.param.name
                    ) {
                      context.report({
                        messageId: 'noCausePropagation',
                        node,
                      });
                    }
                  } else {
                    if (
                      //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      body.argument.arguments[2].expression.name &&
                      //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      body.argument.arguments[2].expression.name !==
                        node.param.name
                    ) {
                      context.report({
                        messageId: 'noCausePropagation',
                        node,
                      });
                    }
                  }
                }
              }
            }
          }
        };
        checkNode('AmplifyUserError');
        checkNode('AmplifyFault');
        checkNode('Error');
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
