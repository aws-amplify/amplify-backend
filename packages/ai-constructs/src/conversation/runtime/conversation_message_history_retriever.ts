import { ConversationMessage, ConversationTurnEvent } from './types';

type ListQueryInput = {
  filter: {
    conversationId: {
      eq: string;
    };
  };
  limit: number;
};

type ListQueryOutput = {
  data: Record<
    string,
    {
      items: Array<ConversationMessage>;
    }
  >;
};

/**
 * TODO
 */
export class ConversationMessageHistoryRetriever {
  /**
   * Creates conversation message history retriever.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly _fetch = fetch
  ) {}

  getEventMessages = async (): Promise<Array<ConversationMessage>> => {
    if (this.event.messages?.length) {
      // This is for backwards compatibility and should be removed with messages property.
      return this.event.messages;
    }
    const request = this.createQueryRequest();
    const res = await this._fetch(request);
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => (responseHeaders[key] = value));
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Attempt to fetch message history was not successful, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${body}`
      );
    }
    const body = await res.json();
    if (body && typeof body === 'object' && 'errors' in body) {
      throw new Error(
        `Attempt to fetch message history was not successful, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${JSON.stringify(body)}`
      );
    }

    console.log(body);
    return (body as ListQueryOutput).data[
      this.event.messageHistoryQuery.listQueryName
    ].items;
  };

  private createQueryRequest = () => {
    const query = `
        query ListMessages($filter: ${this.event.messageHistoryQuery.listQueryInputTypeName}!, $limit: Int) {
            ${this.event.messageHistoryQuery.listQueryName}(filter: $filter, limit: $limit) {
              items {
                id
                conversationId
                role
                content {
                  text
                  document {
                    source {
                      bytes
                    }
                    format
                    name
                  }
                  image {
                    format
                    source {
                      bytes
                    }
                  }
                  toolResult {
                    content {
                      document {
                        format
                        name
                        source {
                          bytes
                        }
                      }
                      image {
                        format
                        source {
                          bytes
                        }
                      }
                      json
                      text
                    }
                    status
                    toolUseId
                  }
                  toolUse {
                    input
                    name
                    toolUseId
                  }
                }
              }
            }
        }
    `;
    const variables: ListQueryInput = {
      filter: {
        conversationId: {
          eq: this.event.conversationId,
        },
      },
      limit: this.event.messageHistoryQuery.listQueryLimit ?? 1000,
    };

    console.log(JSON.stringify({ query, variables }, null, 2));
    return new Request(this.event.graphqlApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
        Authorization: this.event.request.headers.authorization,
      },
      body: JSON.stringify({ query, variables }),
    });
  };
}
