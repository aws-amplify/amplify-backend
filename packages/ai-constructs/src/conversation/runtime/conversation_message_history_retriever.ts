import { ConversationMessage, ConversationTurnEvent } from './types';
import { GraphqlRequestExecutor } from './graphql_request_executor';

export type ConversationHistoryMessageItem = ConversationMessage & {
  id: string;
  conversationId: string;
  associatedUserMessageId?: string;
  aiContext?: unknown;
};

export type GetQueryInput = {
  id: string;
};

export type GetQueryOutput = {
  data: Record<string, ConversationHistoryMessageItem>;
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
      items: Array<ConversationHistoryMessageItem>;
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
                associatedUserMessageId
                aiContext
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
 * This class is responsible for retrieving message history that belongs to conversation turn event.
 * It queries AppSync to list messages that belong to conversation.
 * Additionally, it looks up a current message in case it's missing in the list due to eventual consistency.
 */
export class ConversationMessageHistoryRetriever {
  /**
   * Creates conversation message history retriever.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly graphqlRequestExecutor = new GraphqlRequestExecutor(
      event.graphqlApiEndpoint,
      event.request.headers.authorization,
      event.request.headers['x-amz-user-agent']
    )
  ) {}

  getMessageHistory = async (): Promise<Array<ConversationMessage>> => {
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

    // Index assistant messages by corresponding user message.
    const assistantMessageByUserMessageId: Map<
      string,
      ConversationHistoryMessageItem
    > = new Map();
    messages.forEach((message) => {
      if (message.role === 'assistant' && message.associatedUserMessageId) {
        assistantMessageByUserMessageId.set(
          message.associatedUserMessageId,
          message
        );
      }
    });

    // Reconcile history and inject aiContext
    return messages.reduce((acc, current) => {
      // Bedrock expects that message history is user->assistant->user->assistant->... and so on.
      // The chronological order doesn't assure this ordering if there were any concurrent messages sent.
      // Therefore, conversation is ordered by user's messages only and corresponding assistant messages are inserted
      // into right place regardless of their createdAt value.
      // This algorithm assumes that GQL query returns messages sorted by createdAt.
      if (current.role === 'assistant') {
        // Initially, skip assistant messages, these might be out of chronological order.
        return acc;
      }
      if (
        current.role === 'user' &&
        !assistantMessageByUserMessageId.has(current.id) &&
        current.id !== this.event.currentMessageId
      ) {
        // Skip user messages that didn't get answer from assistant yet.
        // These might be still "in-flight", i.e. assistant is still working on them in separate invocation.
        // Except current message, we want to process that one.
        return acc;
      }
      const aiContext = current.aiContext;
      const content = aiContext
        ? [...current.content, { text: JSON.stringify(aiContext) }]
        : current.content;

      acc.push({ role: current.role, content });

      // Find and insert corresponding assistant message.
      const correspondingAssistantMessage = assistantMessageByUserMessageId.get(
        current.id
      );
      if (correspondingAssistantMessage) {
        acc.push({
          role: correspondingAssistantMessage.role,
          content: correspondingAssistantMessage.content,
        });
      }
      return acc;
    }, [] as Array<ConversationMessage>);
  };

  private getCurrentMessage =
    async (): Promise<ConversationHistoryMessageItem> => {
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

  private listMessages = async (): Promise<
    Array<ConversationHistoryMessageItem>
  > => {
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

    const items =
      response.data[this.event.messageHistoryQuery.listQueryName].items;

    items.forEach((item) => {
      item.content?.forEach((contentBlock) => {
        let property: keyof typeof contentBlock;
        for (property in contentBlock) {
          // Deserialization of GraphQl query result sets these properties to 'null'
          // This can trigger Bedrock SDK validation as it expects 'undefined' if properties are not set.
          // We can't fix how GraphQl response is deserialized.
          // Therefore, we apply this transformation to fix the data.
          if (contentBlock[property] === null) {
            contentBlock[property] = undefined;
          }
        }

        if (typeof contentBlock.toolUse?.input === 'string') {
          // toolUse.input may come as serialized JSON for Client Tools.
          // Parse it in that case.
          contentBlock.toolUse.input = JSON.parse(contentBlock.toolUse.input);
        }
        if (contentBlock.toolResult?.content) {
          contentBlock.toolResult.content.forEach((toolResultContentBlock) => {
            if (typeof toolResultContentBlock.json === 'string') {
              // toolResult.content[].json may come as serialized JSON for Client Tools.
              // Parse it in that case.
              toolResultContentBlock.json = JSON.parse(
                toolResultContentBlock.json
              );
            }
          });
        }
      });
    });

    return items;
  };
}
