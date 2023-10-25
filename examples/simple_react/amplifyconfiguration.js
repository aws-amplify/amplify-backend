const amplifyConfig = {
  aws_user_pools_id: 'us-west-2_mQXItn6nQ',
  aws_user_pools_web_client_id: '1thjh7n03ie7nsik07nvob6i2g',
  aws_cognito_region: 'us-west-2',
  aws_appsync_graphqlEndpoint:
    'https://bc66qlvi5jhtfkym4qhcxauoui.appsync-api.us-west-2.amazonaws.com/graphql',
  aws_appsync_region: 'us-west-2',
  aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  aws_appsync_additionalAuthenticationTypes: 'AWS_IAM',
  modelIntrospection: {
    version: 1,
    models: {
      Todo: {
        name: 'Todo',
        fields: {
          id: {
            name: 'id',
            isArray: false,
            type: 'ID',
            isRequired: true,
            attributes: [],
          },
          name: {
            name: 'name',
            isArray: false,
            type: 'String',
            isRequired: true,
            attributes: [],
          },
          descriptions12: {
            name: 'descriptions12',
            isArray: false,
            type: 'String',
            isRequired: false,
            attributes: [],
          },
          title: {
            name: 'title',
            isArray: false,
            type: 'String',
            isRequired: false,
            attributes: [],
          },
          createdAt: {
            name: 'createdAt',
            isArray: false,
            type: 'AWSDateTime',
            isRequired: false,
            attributes: [],
            isReadOnly: true,
          },
          updatedAt: {
            name: 'updatedAt',
            isArray: false,
            type: 'AWSDateTime',
            isRequired: false,
            attributes: [],
            isReadOnly: true,
          },
        },
        syncable: true,
        pluralName: 'Todos',
        attributes: [
          {
            type: 'model',
            properties: {},
          },
          {
            type: 'auth',
            properties: {
              rules: [
                {
                  allow: 'private',
                  operations: ['create', 'update', 'delete', 'read'],
                },
              ],
            },
          },
        ],
        primaryKeyInfo: {
          isCustomPrimaryKey: false,
          primaryKeyFieldName: 'id',
          sortKeyFieldNames: [],
        },
      },
    },
    enums: {},
    nonModels: {},
  },
};
export default amplifyConfig;
