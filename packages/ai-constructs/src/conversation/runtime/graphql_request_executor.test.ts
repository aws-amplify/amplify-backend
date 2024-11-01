import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { text } from 'node:stream/consumers';
import { GraphqlRequestExecutor } from './graphql_request_executor';
import { UserAgentProvider } from './user_agent_provider';
import { ConversationTurnEvent } from './types';

void describe('Graphql executor test', () => {
  const graphqlEndpoint = 'http://fake.endpoint/';
  const accessToken = 'testToken';
  const userAgent = 'testUserAgent';
  const userAgentProvider = new UserAgentProvider(
    {} as unknown as ConversationTurnEvent
  );
  mock.method(userAgentProvider, 'getUserAgent', () => userAgent);

  void it('sends request to appsync', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(new Response('{}', { status: 200 }))
    );
    const executor = new GraphqlRequestExecutor(
      graphqlEndpoint,
      accessToken,
      userAgentProvider,
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    await executor.executeGraphql({
      query,
      variables,
    });

    assert.strictEqual(fetchMock.mock.calls.length, 1);
    const request: Request = fetchMock.mock.calls[0].arguments[0] as Request;
    assert.strictEqual(request.url, graphqlEndpoint);
    assert.strictEqual(request.method, 'POST');
    assert.strictEqual(
      request.headers.get('Content-Type'),
      'application/graphql'
    );
    assert.strictEqual(request.headers.get('Authorization'), accessToken);
    assert.strictEqual(request.headers.get('x-amz-user-agent'), userAgent);
    assert.ok(request.body);
    assert.deepStrictEqual(JSON.parse(await text(request.body)), {
      query: 'testQuery',
      variables: { testVariableKey: 'testVariableValue' },
    });
  });

  void it('method provided user agent takes precedence', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(new Response('{}', { status: 200 }))
    );
    const executor = new GraphqlRequestExecutor(
      graphqlEndpoint,
      accessToken,
      userAgentProvider,
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    await executor.executeGraphql(
      {
        query,
        variables,
      },
      {
        userAgent: 'methodScopedUserAgent',
      }
    );

    assert.strictEqual(fetchMock.mock.calls.length, 1);
    const request: Request = fetchMock.mock.calls[0].arguments[0] as Request;
    assert.strictEqual(
      request.headers.get('x-amz-user-agent'),
      'methodScopedUserAgent'
    );
  });

  void it('throws if response is not 2xx', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(
          new Response('Body with error', {
            status: 400,
            headers: { testHeaderKey: 'testHeaderValue' },
          })
        )
    );
    const executor = new GraphqlRequestExecutor(
      graphqlEndpoint,
      accessToken,
      userAgentProvider,
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    await assert.rejects(
      () => executor.executeGraphql({ query, variables }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'GraphQL request failed, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body=Body with error'
        );
        return true;
      }
    );
  });

  void it('throws if graphql returns errors', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(
          new Response(
            JSON.stringify({
              errors: ['Some GQL error'],
            }),
            {
              status: 200,
              headers: { testHeaderKey: 'testHeaderValue' },
            }
          )
        )
    );
    const executor = new GraphqlRequestExecutor(
      graphqlEndpoint,
      accessToken,
      userAgentProvider,
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    await assert.rejects(
      () => executor.executeGraphql({ query, variables }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'GraphQL request failed, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body={"errors":["Some GQL error"]}'
        );
        return true;
      }
    );
  });
});
