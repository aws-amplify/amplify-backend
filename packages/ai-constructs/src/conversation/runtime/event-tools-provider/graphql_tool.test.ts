import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { GraphQlTool } from './graphql_tool';
import {
  GraphqlRequest,
  GraphqlRequestExecutor,
} from '../graphql_request_executor';
import { DocumentType } from '@smithy/types';
import { UserAgentProvider } from '../user_agent_provider';
import { ConversationTurnEvent } from '../types';

void describe('GraphQl tool', () => {
  const graphQlEndpoint = 'http://test.endpoint/';
  const query = 'testQuery';
  const accessToken = 'testAccessToken';
  const userAgentProvider = new UserAgentProvider(
    {} as unknown as ConversationTurnEvent
  );
  mock.method(userAgentProvider, 'getUserAgent', () => '');

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
      userAgentProvider,
      graphqlRequestExecutor
    );
  };

  void it('sends a query', async () => {
    const testResponse = {
      test: 'response',
    };
    const graphqlRequestExecutor = new GraphqlRequestExecutor(
      '',
      '',
      userAgentProvider
    );
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
    });
    assert.deepStrictEqual(toolResult, {
      json: {
        test: 'response',
      },
    });
  });
});
