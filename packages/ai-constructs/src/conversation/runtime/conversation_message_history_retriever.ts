import { ConversationMessage, ConversationTurnEvent } from './types';
import { GraphqlRequestExecutor } from './graphql_request_executor';

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
    private readonly graphqlRequestExecutor = new GraphqlRequestExecutor(
      event.graphqlApiEndpoint,
      event.request.headers.authorization
    )
  ) {}

  getEventMessages = async (): Promise<Array<ConversationMessage>> => {
    if (this.event.messages?.length) {
      // This is for backwards compatibility and should be removed with messages property.
      return this.event.messages;
    }
    const { query, variables } = this.createQueryRequest();
    const response = await this.graphqlRequestExecutor.executeGraphql<
      ListQueryInput,
      ListQueryOutput
    >({
      query,
      variables,
      onErrorMessage: 'Attempt to fetch message history failed',
    });

    return response.data[this.event.messageHistoryQuery.listQueryName].items;
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

    return { query, variables };
  };
}
