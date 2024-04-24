import { describe, it } from 'node:test';
import { convertSchemaToCDK } from './convert_schema.js';
import assert from 'node:assert';
import { a } from '@aws-amplify/data-schema';
import { configure } from '@aws-amplify/data-schema/internals';
import { Construct } from 'constructs';
import {
  BackendIdentifier,
  BackendSecret,
  BackendSecretResolver,
  ResolvePathResult,
  StableBackendIdentifiers,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';
import { ParameterPathConversions } from '@aws-amplify/platform-core';
import { createHash } from 'crypto';

const testStack = {} as Construct;

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

class TestBackendSecretResolver implements BackendSecretResolver {
  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(testStack, testBackendIdentifier);
  };
  resolvePath = (backendSecret: BackendSecret): ResolvePathResult => {
    return backendSecret.resolvePath(testBackendIdentifier);
  };
}

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): SecretValue => {
    return SecretValue.unsafePlainText(this.secretName);
  };
  resolvePath = (): ResolvePathResult => {
    return {
      branchSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier,
        this.secretName
      ),
      sharedSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier.namespace,
        this.secretName
      ),
    };
  };
}

class TestStableBackendIdentifiers implements StableBackendIdentifiers {
  private hash: string;
  constructor() {
    this.hash = createHash('sha512')
      .update(testBackendIdentifier.type)
      .update(testBackendIdentifier.namespace)
      .update(testBackendIdentifier.name)
      .digest('hex')
      .slice(0, 20);
  }
  getStableBackendHash = (): string => this.hash;
}

const removeWhiteSpaceForComparison = (content: string): string =>
  content.replaceAll(/ |\n/g, '');

void describe('convertSchemaToCDK', () => {
  const secretResolver = new TestBackendSecretResolver();
  const stableBackendIdentifiers = new TestStableBackendIdentifiers();

  void it('generates for a graphql schema', () => {
    const graphqlSchema = /* GraphQL */ `
      type Todo @model @auth(rules: { allow: owner }) {
        content: String!
      }
      type Query {
        echo(message: String!): String!
      }
    `;
    const convertedDefinition = convertSchemaToCDK(
      graphqlSchema,
      secretResolver,
      stableBackendIdentifiers
    );
    assert.deepEqual(convertedDefinition.schema, graphqlSchema);
    assert.deepEqual(convertedDefinition.dataSourceStrategies, {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
    });
  });

  void it('generates for a typed schema', () => {
    const expectedGraphqlSchema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
        content: String!
      }
    `;
    const typedSchema = a
      .schema({
        Todo: a.model({
          content: a.string().required(),
        }),
      })
      .authorization((allow) => allow.publicApiKey());
    const convertedDefinition = convertSchemaToCDK(
      typedSchema,
      secretResolver,
      stableBackendIdentifiers
    );
    assert.deepEqual(
      removeWhiteSpaceForComparison(convertedDefinition.schema),
      removeWhiteSpaceForComparison(expectedGraphqlSchema)
    );
    assert.deepEqual(convertedDefinition.dataSourceStrategies, {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
    });
  });

  void it('produces appropriate dataSourceStrategies for a typed schema with multiple models', () => {
    const typedSchema = a
      .schema({
        Todo: a.model({
          content: a.string().required(),
        }),
        Blog: a.model({
          title: a.string(),
        }),
      })
      .authorization((allow) => allow.publicApiKey());
    const convertedDefinition = convertSchemaToCDK(
      typedSchema,
      secretResolver,
      stableBackendIdentifiers
    );
    assert.deepEqual(convertedDefinition.dataSourceStrategies, {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
      Blog: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
    });
  });

  void it('uses the only appropriate dbType and provisioningStrategy', () => {
    const convertedDefinition = convertSchemaToCDK(
      'type Todo @model @auth(rules: { allow: public }) { id: ID! }',
      secretResolver,
      stableBackendIdentifiers
    );
    assert.equal(
      Object.values(convertedDefinition.dataSourceStrategies).length,
      1
    );
    assert.deepEqual(
      Object.values(convertedDefinition.dataSourceStrategies)[0],
      {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
      'dbType should ALWAYS be set to DYNAMODB, and provisionStrategy should ALWAYS be AMPLIFY_TABLE, changing these values will trigger db re-provisioning'
    );
  });

  void it('produces expected definition for Postgresql schema with custom query reference', () => {
    const postgresSchema = configure({
      database: {
        engine: 'postgresql',
        connectionUri: new TestBackendSecret('POSTGRES_CONNECTION_STRING'),
      },
    }).schema({
      post: a
        .model({
          id: a.integer().required(),
          title: a.string(),
        })
        .identifier(['id'])
        .authorization((allow) => allow.publicApiKey()),
    });

    const modified = postgresSchema.addQueries({
      oddList: a
        .query()
        .handler(
          a.handler.sqlReference('../test-assets/test-sql-handler/oddList.sql')
        )
        .returns(a.ref('post'))
        .authorization((allow) => allow.publicApiKey()),
    });

    const convertedDefinition = convertSchemaToCDK(
      modified,
      secretResolver,
      stableBackendIdentifiers
    );

    assert.equal(
      Object.values(convertedDefinition.dataSourceStrategies).length,
      1
    );
    assert.deepEqual(
      Object.values(convertedDefinition.dataSourceStrategies)[0],
      {
        dbType: 'POSTGRES',
        // eslint-disable-next-line spellcheck/spell-checker
        name: '00034dcf3444861c3ca5postgresql',
        dbConnectionConfig: {
          connectionUriSsmPath: [
            '/amplify/testBackendId/testBranchName-branch-e482a1c36f/POSTGRES_CONNECTION_STRING',
            '/amplify/shared/testBackendId/POSTGRES_CONNECTION_STRING',
          ],
        },
        customSqlStatements: {
          '../test-assets/test-sql-handler/oddList.sql':
            'SELECT * from post where id % 2 = 1;',
        },
        vpcConfiguration: undefined,
      }
    );
  });

  void it('produces expected definition for Postgresql schema with inline custom query reference', () => {
    const postgresSchema = configure({
      database: {
        engine: 'postgresql',
        connectionUri: new TestBackendSecret('POSTGRES_CONNECTION_STRING'),
      },
    }).schema({
      post: a
        .model({
          id: a.integer().required(),
          title: a.string(),
        })
        .identifier(['id'])
        .authorization((allow) => allow.publicApiKey()),
    });

    const modified = postgresSchema.addQueries({
      oddList: a
        .query()
        .handler(a.handler.inlineSql('SELECT * from post where id % 2 = 1;'))
        .returns(a.ref('post'))
        .authorization((allow) => allow.publicApiKey()),
    });

    const convertedDefinition = convertSchemaToCDK(
      modified,
      secretResolver,
      stableBackendIdentifiers
    );

    assert.equal(
      Object.values(convertedDefinition.dataSourceStrategies).length,
      1
    );
    assert.deepEqual(
      Object.values(convertedDefinition.dataSourceStrategies)[0],
      {
        dbType: 'POSTGRES',
        // eslint-disable-next-line spellcheck/spell-checker
        name: '00034dcf3444861c3ca5postgresql',
        dbConnectionConfig: {
          connectionUriSsmPath: [
            '/amplify/testBackendId/testBranchName-branch-e482a1c36f/POSTGRES_CONNECTION_STRING',
            '/amplify/shared/testBackendId/POSTGRES_CONNECTION_STRING',
          ],
        },
        customSqlStatements: {},
        vpcConfiguration: undefined,
      }
    );
  });

  void it('produces expected definition for MySQL schema with vpc config', () => {
    const postgresSchema = configure({
      database: {
        engine: 'mysql',
        connectionUri: new TestBackendSecret('MYSQL_CONNECTION_STRING'),
        /* eslint-disable spellcheck/spell-checker */
        vpcConfig: {
          vpcId: 'vpc-a1aa11a1',
          securityGroupIds: ['sg-11111a11'],
          subnetAvailabilityZones: [
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1d',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1c',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1f',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1e',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1a',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1b',
            },
          ],
          /* eslint-enable spellcheck/spell-checker */
        },
      },
    }).schema({
      post: a
        .model({
          id: a.integer().required(),
          title: a.string(),
        })
        .identifier(['id'])
        .authorization((allow) => allow.publicApiKey()),
    });

    const modified = postgresSchema.addQueries({
      oddList: a
        .query()
        .handler(a.handler.inlineSql('SELECT * from post where id % 2 = 1;'))
        .returns(a.ref('post'))
        .authorization((allow) => allow.publicApiKey()),
    });

    const convertedDefinition = convertSchemaToCDK(
      modified,
      secretResolver,
      stableBackendIdentifiers
    );

    assert.equal(
      Object.values(convertedDefinition.dataSourceStrategies).length,
      1
    );
    assert.deepEqual(
      Object.values(convertedDefinition.dataSourceStrategies)[0],
      {
        dbType: 'MYSQL',
        /* eslint-disable spellcheck/spell-checker */
        name: '00034dcf3444861c3ca5mysql',
        dbConnectionConfig: {
          connectionUriSsmPath: [
            '/amplify/testBackendId/testBranchName-branch-e482a1c36f/MYSQL_CONNECTION_STRING',
            '/amplify/shared/testBackendId/MYSQL_CONNECTION_STRING',
          ],
        },
        customSqlStatements: {},
        vpcConfiguration: {
          vpcId: 'vpc-a1aa11a1',
          securityGroupIds: ['sg-11111a11'],
          subnetAvailabilityZoneConfig: [
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1d',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1c',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1f',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1e',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1a',
            },
            {
              subnetId: 'subnet-1aa1aa11',
              availabilityZone: 'us-east-1b',
            },
          ],
        },
        /* eslint-enable spellcheck/spell-checker */
      }
    );
  });
});
