import { ESLintUtils } from '@typescript-eslint/utils';

export const propagateErrorCause = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      // This naming comes from @typescript-eslint/utils types.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      CatchClause(node) {
        const checkNode = (errorType: string) => {
          if (!node.param) {
            // we encounter this, presumably the error will not be wrapped in If/SwitchStatements
            for (const throwBody of node.body.body) {
              if (
                throwBody.type === 'ThrowStatement' &&
                //@ts-expect-error assumes incorrect type for body.argument
                throwBody.argument.callee.name === errorType
              ) {
                context.report({
                  messageId: 'noCausePropagation',
                  node,
                });
              }
            }
          } else if (
            node.param &&
            node.param.type === 'Identifier' &&
            node.param.name &&
            node.body.body.length
          ) {
            const causeVarNames = [];
            causeVarNames.push(node.param.name);
            const queue = [];
            let body = node.body.body[0];

            if (
              body.type !== 'ThrowStatement' &&
              body.type !== 'IfStatement' &&
              body.type !== 'SwitchStatement' &&
              body.type !== 'BlockStatement'
            ) {
              for (const newBody of node.body.body) {
                if (newBody.type === 'VariableDeclaration') {
                  //@ts-expect-error assumes incorrect type for body.declarations[0].id
                  causeVarNames.push(body.declarations[0].id.name);
                } else if (
                  newBody.type === 'ThrowStatement' ||
                  newBody.type === 'IfStatement' ||
                  newBody.type === 'SwitchStatement' ||
                  newBody.type === 'BlockStatement'
                ) {
                  body = newBody;
                  break;
                }
              }
            }

            let curInd = 0;
            queue.push(body);

            while (curInd < queue.length) {
              body = queue[curInd];
              if (body.type === 'ThrowStatement') {
                if (
                  body.argument &&
                  //@ts-expect-error assumes incorrect type for body.argument
                  body.argument?.type === 'NewExpression' &&
                  //@ts-expect-error assumes incorrect type for body.argument
                  body.argument.callee.name === errorType
                ) {
                  if (errorType === 'Error') {
                    //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                    if (body.argument.arguments.length > 1) {
                      //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      for (const prop of body.argument.arguments[1]
                        .properties) {
                        if (
                          prop.key.name === 'cause' &&
                          causeVarNames.includes(prop.value.name)
                        ) {
                          return; // the error was thrown with a cause and the cause was valid
                        }
                      }
                      context.report({
                        messageId: 'noCausePropagation',
                        node,
                      });
                    } else {
                      context.report({
                        messageId: 'noCausePropagation',
                        node,
                      });
                    }
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
                          !causeVarNames.includes(
                            //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                            body.argument.arguments[2].consequent.name
                          )
                        ) {
                          context.report({
                            messageId: 'noCausePropagation',
                            node,
                          });
                        }
                        //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      } else if (body.argument.arguments[2].expression) {
                        if (
                          //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                          body.argument.arguments[2].expression.name &&
                          !causeVarNames.includes(
                            //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                            body.argument.arguments[2].expression.name
                          )
                        ) {
                          context.report({
                            messageId: 'noCausePropagation',
                            node,
                          });
                        }
                        //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                      } else if (body.argument.arguments[2].name) {
                        if (
                          !causeVarNames.includes(
                            //@ts-expect-error incorrectly assumes type of body.argument is 'never'
                            body.argument.arguments[2].name
                          )
                        ) {
                          context.report({
                            messageId: 'noCausePropagation',
                            node,
                          });
                        }
                      } else {
                        // if we find some other configuration, assume it is invalid
                        context.report({
                          messageId: 'noCausePropagation',
                          node,
                        });
                      }
                    }
                  }
                }
              } else if (body.type === 'IfStatement') {
                if (body.consequent) {
                  queue.push(body.consequent);
                }
                if (body.alternate) {
                  queue.push(body.alternate);
                }
              } else if (body.type === 'BlockStatement') {
                queue.push(body.body[0]);
              } else if (body.type === 'SwitchStatement') {
                for (const switchCase of body.cases) {
                  queue.push(switchCase.consequent[0]);
                }
              }
              curInd++;
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
        'The error message must be presented with a cause because it wraps another error.',
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
