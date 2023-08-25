/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const deleteTodo = /* GraphQL */ `
  mutation DeleteTodo(
    $condition: ModelTodoConditionInput
    $input: DeleteTodoInput!
  ) {
    deleteTodo(condition: $condition, input: $input) {
      createdAt
      description
      id
      name
      updatedAt
      __typename
    }
  }
`;
