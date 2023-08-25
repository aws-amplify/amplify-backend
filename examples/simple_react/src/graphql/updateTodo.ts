/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const updateTodo = /* GraphQL */ `
  mutation UpdateTodo(
    $condition: ModelTodoConditionInput
    $input: UpdateTodoInput!
  ) {
    updateTodo(condition: $condition, input: $input) {
      createdAt
      description
      id
      name
      updatedAt
      __typename
    }
  }
`;
