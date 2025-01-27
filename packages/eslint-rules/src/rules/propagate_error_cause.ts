import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { findNestedNodes } from './find_nested_nodes';

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
                (
                  (throwBody.argument as unknown as TSESTree.NewExpression)
                    .callee as TSESTree.Identifier
                ).name === errorType
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

            if (node.body.body[0].type === 'VariableDeclaration') {
              for (const newBody of node.body.body) {
                if (newBody.type === 'VariableDeclaration') {
                  causeVarNames.push(
                    (
                      node.body.body[0].declarations[0]
                        .id as TSESTree.Identifier
                    ).name
                  );
                }
              }
            }

            for (const curNode of findNestedNodes(node)) {
              if (
                curNode.argument &&
                (curNode.argument as unknown as TSESTree.NewExpression).type ===
                  'NewExpression' &&
                (
                  (curNode.argument as unknown as TSESTree.NewExpression)
                    .callee as TSESTree.Identifier
                ).name === errorType
              ) {
                if (errorType === 'Error') {
                  if (
                    (curNode.argument as unknown as TSESTree.NewExpression)
                      .arguments.length > 1
                  ) {
                    for (const prop of (
                      (curNode.argument as unknown as TSESTree.NewExpression)
                        .arguments[1] as TSESTree.ObjectExpression
                    ).properties) {
                      if (
                        ((prop as TSESTree.Property).key as TSESTree.Identifier)
                          .name === 'cause' &&
                        causeVarNames.includes(
                          (
                            (prop as TSESTree.Property)
                              .value as TSESTree.Identifier
                          ).name
                        )
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
                  if (
                    (curNode.argument as unknown as TSESTree.NewExpression)
                      .arguments.length < 3
                  ) {
                    context.report({
                      messageId: 'noCausePropagation',
                      node,
                    });
                  } else {
                    if (
                      (
                        (curNode.argument as unknown as TSESTree.NewExpression)
                          .arguments[2] as TSESTree.ConditionalExpression
                      ).consequent
                    ) {
                      if (
                        (
                          (
                            (
                              curNode.argument as unknown as TSESTree.NewExpression
                            ).arguments[2] as TSESTree.ConditionalExpression
                          ).consequent as TSESTree.Identifier
                        ).name &&
                        !causeVarNames.includes(
                          (
                            (
                              (
                                curNode.argument as unknown as TSESTree.NewExpression
                              ).arguments[2] as TSESTree.ConditionalExpression
                            ).consequent as TSESTree.Identifier
                          ).name
                        )
                      ) {
                        context.report({
                          messageId: 'noCausePropagation',
                          node,
                        });
                      }
                    } else if (
                      (
                        (curNode.argument as unknown as TSESTree.NewExpression)
                          .arguments[2] as TSESTree.TSAsExpression
                      ).expression
                    ) {
                      if (
                        (
                          (
                            (
                              curNode.argument as unknown as TSESTree.NewExpression
                            ).arguments[2] as TSESTree.TSAsExpression
                          ).expression as TSESTree.Identifier
                        ).name &&
                        !causeVarNames.includes(
                          (
                            (
                              (
                                curNode.argument as unknown as TSESTree.NewExpression
                              ).arguments[2] as TSESTree.TSAsExpression
                            ).expression as TSESTree.Identifier
                          ).name
                        )
                      ) {
                        context.report({
                          messageId: 'noCausePropagation',
                          node,
                        });
                      }
                    } else if (
                      (
                        (curNode.argument as unknown as TSESTree.NewExpression)
                          .arguments[2] as TSESTree.Identifier
                      ).name
                    ) {
                      if (
                        !causeVarNames.includes(
                          (
                            (
                              curNode.argument as unknown as TSESTree.NewExpression
                            ).arguments[2] as TSESTree.Identifier
                          ).name
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
