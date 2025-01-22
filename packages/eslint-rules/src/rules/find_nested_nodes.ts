import { TSESTree } from '@typescript-eslint/utils';

/**
 * Generator function that runs BFS on nodes in catch block AST
 */
//eslint-disable-next-line no-restricted-syntax
export function* findNestedNodes(root: TSESTree.CatchClause) {
  const queue = [];
  let body = root.body.body[0];

  if (body.type === 'VariableDeclaration') {
    for (const newBody of root.body.body) {
      if (
        newBody.type === 'ThrowStatement' ||
        newBody.type === 'IfStatement' ||
        newBody.type === 'SwitchStatement'
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
      yield body;
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
