import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { GraphQlTool } from './graphql_tool';
import {
  GraphqlRequest,
  GraphqlRequestExecutor,
} from '../graphql_request_executor';
import { DocumentType } from '@smithy/types';

void describe('GraphQl tool', () => {
  const graphQlEndpoint = 'http://test.endpoint/';
  const query = 'testQuery';
  const accessToken = 'testAccessToken';

  const createGraphQlTool = (
    graphqlRequestExecutor: GraphqlRequestExecutor
  ): GraphQlTool => {
    return new GraphQlTool(
      'testName',
      'testDescription',
      { json: {} },
      graphQlEndpoint,
      query,
      accessToken,
      graphqlRequestExecutor
    );
  };

  void it('sends a query', async () => {
    const testResponse = {
      test: 'response',
    };
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve(testResponse)
    );
    const tool = createGraphQlTool(graphqlRequestExecutor);
    const toolResult = await tool.execute({ test: 'input' });

    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<DocumentType>;
    assert.deepStrictEqual(request, {
      query: 'testQuery',
      variables: {
        test: 'input',
      },
      onErrorMessage: "GraphQl tool 'testName' failed",
    });
    assert.deepStrictEqual(toolResult, {
      json: {
        test: 'response',
      },
    });
  });
});
