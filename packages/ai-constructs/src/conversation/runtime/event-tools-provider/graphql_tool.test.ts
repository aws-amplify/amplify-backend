import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { text } from 'node:stream/consumers';
import { GraphQlTool } from './graphql_tool';

void describe('GraphQl tool', () => {
  const graphQlEndpoint = 'http://test.endpoint/';
  const query = 'testQuery';
  const accessToken = 'testAccessToken';

  const createGraphQlTool = (fetchMock: typeof fetch): GraphQlTool => {
    return new GraphQlTool(
      'testName',
      'testDescription',
      { json: {} },
      graphQlEndpoint,
      query,
      accessToken,
      fetchMock
    );
  };

  void it('sends a query', async () => {
    const testResponse = {
      test: 'response',
    };
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(
          new Response(JSON.stringify(testResponse), { status: 200 })
        )
    );
    const tool = createGraphQlTool(fetchMock);
    const toolResult = await tool.execute({ test: 'input' });

    assert.strictEqual(fetchMock.mock.calls.length, 1);
    const request: Request = fetchMock.mock.calls[0].arguments[0] as Request;
    assert.strictEqual(request.url, graphQlEndpoint);
    assert.strictEqual(request.method, 'POST');
    assert.strictEqual(
      request.headers.get('Content-Type'),
      'application/graphql'
    );
    assert.strictEqual(request.headers.get('Authorization'), accessToken);
    assert.ok(request.body);
    assert.deepStrictEqual(JSON.parse(await text(request.body)), {
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
    const tool = createGraphQlTool(fetchMock);
    await assert.rejects(
      () => tool.execute({ test: 'input' }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'GraphQl tool \'testName\' failed, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body=Body with error'
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
    const tool = createGraphQlTool(fetchMock);
    await assert.rejects(
      () => tool.execute({ test: 'input' }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'GraphQl tool \'testName\' failed, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body={"errors":["Some GQL error"]}'
        );
        return true;
      }
    );
  });
});
