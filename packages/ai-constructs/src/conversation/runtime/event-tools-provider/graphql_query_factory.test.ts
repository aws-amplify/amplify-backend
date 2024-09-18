import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConversationTurnEventToolConfiguration } from './types';
import { GraphQlQueryFactory } from './graphql_query_factory';

type TestCase = {
  toolDefinition: ConversationTurnEventToolConfiguration;
  expectedQuery: string;
};

const testCases: Array<TestCase> = [
  {
    toolDefinition: {
      name: 'toolName1',
      description: 'toolDescription1',
      inputSchema: {
        json: {
          properties: {
            property1: {
              type: 'string',
            },
            property2: {
              type: 'number',
            },
          },
          required: ['property1'],
        },
      },
      graphqlRequestInputDescriptor: {
        queryName: 'testQueryName1',
        selectionSet: 'testSelection1 testSelection2',
        propertyTypes: {
          property1: 'String!',
          property2: 'Int',
        },
      },
    },
    expectedQuery: `
    query ToolQuery($property1: String!, $property2: Int) {
      testQueryName1(property1: $property1, property2: $property2) { testSelection1 testSelection2 }
    }
    `,
  },
  {
    toolDefinition: {
      name: 'toolName2',
      description: 'toolDescription2',
      inputSchema: {
        json: {},
      },
      graphqlRequestInputDescriptor: {
        queryName: 'testQueryName2',
        selectionSet: 'testSelection3 testSelection4',
        propertyTypes: {},
      },
    },
    expectedQuery: `
    query ToolQuery {
      testQueryName2 { testSelection3 testSelection4 }
    }
    `,
  },
  {
    toolDefinition: {
      name: 'toolName3',
      description: 'toolDescription3',
      inputSchema: {
        json: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      graphqlRequestInputDescriptor: {
        queryName: 'testQueryName3',
        selectionSet: '',
        propertyTypes: {},
      },
    },
    expectedQuery: `
    query ToolQuery {
      testQueryName3
    }
    `,
  },
];

void describe('GraphQl query factory', () => {
  const queryFactory = new GraphQlQueryFactory();
  void it('should map tool definitions to queries', () => {
    for (const testCase of testCases) {
      const query = queryFactory.createQuery(testCase.toolDefinition);
      assert.strictEqual(query.trim(), testCase.expectedQuery.trim());
    }
  });
});
