export const defaultDirectiveDefinitions = `
directive @aws_subscribe(mutations: [String!]!) on FIELD_DEFINITION

directive @aws_auth(cognito_groups: [String!]!) on FIELD_DEFINITION

directive @aws_api_key on FIELD_DEFINITION | OBJECT

directive @aws_iam on FIELD_DEFINITION | OBJECT

directive @aws_oidc on FIELD_DEFINITION | OBJECT

directive @aws_cognito_user_pools(cognito_groups: [String!]) on FIELD_DEFINITION | OBJECT

directive @aws_lambda on FIELD_DEFINITION | OBJECT

directive @deprecated(reason: String) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | ENUM | ENUM_VALUE

directive @model(queries: ModelQueryMap, mutations: ModelMutationMap, subscriptions: ModelSubscriptionMap, timestamps: TimestampConfiguration) on OBJECT
input ModelMutationMap {
  create: String
  update: String
  delete: String
}
input ModelQueryMap {
  get: String
  list: String
}
input ModelSubscriptionMap {
  onCreate: [String]
  onUpdate: [String]
  onDelete: [String]
  level: ModelSubscriptionLevel
}
enum ModelSubscriptionLevel {
  off
  public
  on
}
input TimestampConfiguration {
  createdAt: String
  updatedAt: String
}
directive @function(name: String!, region: String, accountId: String) repeatable on FIELD_DEFINITION
directive @http(method: HttpMethod = GET, url: String!, headers: [HttpHeader] = []) on FIELD_DEFINITION
enum HttpMethod {
  GET
  POST
  PUT
  DELETE
  PATCH
}
input HttpHeader {
  key: String
  value: String
}
directive @predictions(actions: [PredictionsActions!]!) on FIELD_DEFINITION
enum PredictionsActions {
  identifyText
  identifyLabels
  convertTextToSpeech
  translateText
}
directive @primaryKey(sortKeyFields: [String]) on FIELD_DEFINITION
directive @index(name: String, sortKeyFields: [String], queryField: String) repeatable on FIELD_DEFINITION
directive @hasMany(indexName: String, fields: [String!], limit: Int = 100) on FIELD_DEFINITION
directive @hasOne(fields: [String!]) on FIELD_DEFINITION
directive @manyToMany(relationName: String!, limit: Int = 100) on FIELD_DEFINITION
directive @belongsTo(fields: [String!]) on FIELD_DEFINITION
directive @default(value: String!) on FIELD_DEFINITION
directive @auth(rules: [AuthRule!]!) on OBJECT | FIELD_DEFINITION
input AuthRule {
  allow: AuthStrategy!
  provider: AuthProvider
  identityClaim: String
  groupClaim: String
  ownerField: String
  groupsField: String
  groups: [String]
  operations: [ModelOperation]
}
enum AuthStrategy {
  owner
  groups
  private
  public
  custom
}
enum AuthProvider {
  apiKey
  iam
  oidc
  userPools
  function
}
enum ModelOperation {
  create
  update
  delete
  read
  list
  get
  sync
  listen
  search
}
directive @mapsTo(name: String!) on OBJECT
directive @searchable(queries: SearchableQueryMap) on OBJECT
input SearchableQueryMap {
  search: String
}
`;
