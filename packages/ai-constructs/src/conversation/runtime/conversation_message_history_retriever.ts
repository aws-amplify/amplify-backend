import { ConversationMessage, ConversationTurnEvent } from './types';
import { GraphqlRequestExecutor } from './graphql_request_executor';

export type GetQueryInput = {
  id: string;
};

export type GetQueryOutput = {
  data: Record<string, ConversationMessage>;
};

export type ListQueryInput = {
  filter: {
    conversationId: {
      eq: string;
    };
  };
  limit: number;
};

export type ListQueryOutput = {
  data: Record<
    string,
    {
      items: Array<ConversationMessage>;
    }
  >;
};

/**
 * These are all properties we have to pull.
 * Unfortunately, GQL doesn't support wildcards.
 * https://github.com/graphql/graphql-spec/issues/127
 */
const messageItemSelectionSet = `
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
`;

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
    const messages = await this.listMessages();

    let currentMessage = messages.find(
      (m) => m.id === this.event.currentMessageId
    );

    // This is a fallback in case current message is not available in the message list.
    // I.e. in a situation when freshly written message is not yet visible in
    // eventually consistent reads.
    if (!currentMessage) {
      currentMessage = await this.getCurrentMessage();
      messages.push(currentMessage);
    }

    return messages;
  };

  private getCurrentMessage = async (): Promise<ConversationMessage> => {
    const query = `
        query GetMessage($id: ${this.event.messageHistoryQuery.getQueryInputTypeName}!) {
            ${this.event.messageHistoryQuery.getQueryName}(id: $id) {
              ${messageItemSelectionSet}
            }
        }
    `;
    const variables: GetQueryInput = {
      id: this.event.currentMessageId,
    };

    const response = await this.graphqlRequestExecutor.executeGraphql<
      GetQueryInput,
      GetQueryOutput
    >({
      query,
      variables,
    });

    return response.data[this.event.messageHistoryQuery.getQueryName];
  };

  private listMessages = async (): Promise<Array<ConversationMessage>> => {
    const query = `
        query ListMessages($filter: ${this.event.messageHistoryQuery.listQueryInputTypeName}!, $limit: Int) {
            ${this.event.messageHistoryQuery.listQueryName}(filter: $filter, limit: $limit) {
              items {
                ${messageItemSelectionSet}
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

    const response = await this.graphqlRequestExecutor.executeGraphql<
      ListQueryInput,
      ListQueryOutput
    >({
      query,
      variables,
    });

    return response.data[this.event.messageHistoryQuery.listQueryName].items;
  };
}
