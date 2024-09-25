export type GraphqlRequest<TVariables> = {
  query: string;
  variables: TVariables;
};

/**
 * This class is responsible for executing GraphQL requests.
 * Serializing query and it's inputs, adding authorization headers,
 * inspecting response for errors and deserializing output.
 */
export class GraphqlRequestExecutor {
  /**
   * Creates GraphQL request executor.
   */
  constructor(
    private readonly graphQlEndpoint: string,
    private readonly accessToken: string,
    private readonly _fetch = fetch
  ) {}

  executeGraphql = async <TVariables, TReturn>(
    request: GraphqlRequest<TVariables>
  ): Promise<TReturn> => {
    const httpRequest = new Request(this.graphQlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
        Authorization: this.accessToken,
      },
      body: JSON.stringify({
        query: request.query,
        variables: request.variables,
      }),
    });

    const res = await this._fetch(httpRequest);
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => (responseHeaders[key] = value));
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `GraphQL request failed, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${body}`
      );
    }
    const body = await res.json();
    if (body && typeof body === 'object' && 'errors' in body) {
      throw new Error(
        `GraphQL request failed, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${JSON.stringify(body)}`
      );
    }
    return body as TReturn;
  };
}
