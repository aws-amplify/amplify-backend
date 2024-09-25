import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { text } from 'node:stream/consumers';
import { GraphqlRequestExecutor } from './graphql_request_executor';

void describe('Graphql executor test', () => {
  const graphqlEndpoint = 'http://fake.endpoint/';
  const accessToken = 'testToken';

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
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    const onErrorMessage = 'testOnErrorMessage';
    await executor.executeGraphql({
      query,
      variables,
      onErrorMessage,
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
    assert.ok(request.body);
    assert.deepStrictEqual(JSON.parse(await text(request.body)), {
      query: 'testQuery',
      variables: { testVariableKey: 'testVariableValue' },
    });
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
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    const onErrorMessage = 'testOnErrorMessage';
    await assert.rejects(
      () => executor.executeGraphql({ query, variables, onErrorMessage }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'testOnErrorMessage, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body=Body with error'
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
      fetchMock
    );
    const query = 'testQuery';
    const variables = {
      testVariableKey: 'testVariableValue',
    };
    const onErrorMessage = 'testOnErrorMessage';
    await assert.rejects(
      () => executor.executeGraphql({ query, variables, onErrorMessage }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'testOnErrorMessage, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body={"errors":["Some GQL error"]}'
        );
        return true;
      }
    );
  });
});
