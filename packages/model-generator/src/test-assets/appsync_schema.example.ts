export const schema = `
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

type ModelTodoConnection {
  items: [Todo]!
  nextToken: String
}

type Mutation {
  createTodo(condition: ModelTodoConditionInput, input: CreateTodoInput!): Todo
  deleteTodo(condition: ModelTodoConditionInput, input: DeleteTodoInput!): Todo
  updateTodo(condition: ModelTodoConditionInput, input: UpdateTodoInput!): Todo
}

type Query {
  getTodo(id: ID!): Todo
  listTodos(
    filter: ModelTodoFilterInput
    limit: Int
    nextToken: String
  ): ModelTodoConnection
}

type Subscription {
  onCreateTodo(filter: ModelSubscriptionTodoFilterInput): Todo
    @aws_subscribe(mutations: ["createTodo"])
  onDeleteTodo(filter: ModelSubscriptionTodoFilterInput): Todo
    @aws_subscribe(mutations: ["deleteTodo"])
  onUpdateTodo(filter: ModelSubscriptionTodoFilterInput): Todo
    @aws_subscribe(mutations: ["updateTodo"])
}

type Todo {
  createdAt: AWSDateTime!
  description: String
  id: ID!
  name: String!
  updatedAt: AWSDateTime!
}

enum ModelAttributeTypes {
  _null
  binary
  binarySet
  bool
  list
  map
  number
  numberSet
  string
  stringSet
}

enum ModelSortDirection {
  ASC
  DESC
}

input CreateTodoInput {
  description: String
  id: ID
  name: String!
}

input DeleteTodoInput {
  id: ID!
}

input ModelBooleanInput {
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  eq: Boolean
  ne: Boolean
}

input ModelFloatInput {
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  between: [Float]
  eq: Float
  ge: Float
  gt: Float
  le: Float
  lt: Float
  ne: Float
}

input ModelIDInput {
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  beginsWith: ID
  between: [ID]
  contains: ID
  eq: ID
  ge: ID
  gt: ID
  le: ID
  lt: ID
  ne: ID
  notContains: ID
  size: ModelSizeInput
}

input ModelIntInput {
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  between: [Int]
  eq: Int
  ge: Int
  gt: Int
  le: Int
  lt: Int
  ne: Int
}

input ModelSizeInput {
  between: [Int]
  eq: Int
  ge: Int
  gt: Int
  le: Int
  lt: Int
  ne: Int
}

input ModelStringInput {
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  beginsWith: String
  between: [String]
  contains: String
  eq: String
  ge: String
  gt: String
  le: String
  lt: String
  ne: String
  notContains: String
  size: ModelSizeInput
}

input ModelSubscriptionBooleanInput {
  eq: Boolean
  ne: Boolean
}

input ModelSubscriptionFloatInput {
  between: [Float]
  eq: Float
  ge: Float
  gt: Float
  in: [Float]
  le: Float
  lt: Float
  ne: Float
  notIn: [Float]
}

input ModelSubscriptionIDInput {
  beginsWith: ID
  between: [ID]
  contains: ID
  eq: ID
  ge: ID
  gt: ID
  in: [ID]
  le: ID
  lt: ID
  ne: ID
  notContains: ID
  notIn: [ID]
}

input ModelSubscriptionIntInput {
  between: [Int]
  eq: Int
  ge: Int
  gt: Int
  in: [Int]
  le: Int
  lt: Int
  ne: Int
  notIn: [Int]
}

input ModelSubscriptionStringInput {
  beginsWith: String
  between: [String]
  contains: String
  eq: String
  ge: String
  gt: String
  in: [String]
  le: String
  lt: String
  ne: String
  notContains: String
  notIn: [String]
}

input ModelSubscriptionTodoFilterInput {
  and: [ModelSubscriptionTodoFilterInput]
  description: ModelSubscriptionStringInput
  id: ModelSubscriptionIDInput
  name: ModelSubscriptionStringInput
  or: [ModelSubscriptionTodoFilterInput]
}

input ModelTodoConditionInput {
  and: [ModelTodoConditionInput]
  description: ModelStringInput
  name: ModelStringInput
  not: ModelTodoConditionInput
  or: [ModelTodoConditionInput]
}

input ModelTodoFilterInput {
  and: [ModelTodoFilterInput]
  description: ModelStringInput
  id: ModelIDInput
  name: ModelStringInput
  not: ModelTodoFilterInput
  or: [ModelTodoFilterInput]
}

input UpdateTodoInput {
  description: String
  id: ID!
  name: String
}`;
