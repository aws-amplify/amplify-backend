import { ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEvent } from './types';

type AssistantMutationResponseInput = {
  input: {
    conversationId: string;
    content: ContentBlock[];
    associatedUserMessageId: string;
  };
};

const assistantResponseRequestOptions = (
  authHeader: string,
  query: string,
  variables: AssistantMutationResponseInput
): RequestInit => {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/graphql',
      Authorization: authHeader,
    },
    body: JSON.stringify({ query, variables }),
  };
};

const assistantResponseInput = (
  event: ConversationTurnEvent,
  content: ContentBlock[]
): AssistantMutationResponseInput => {
  const { conversationId, currentMessageId: associatedUserMessageId } = event.args;
  const preparedContent = content.map((block) => {
    if (block.toolUse) {
      // The `input` field is typed as `AWSJSON` in the GraphQL API because it can represent
      // arbitrary JSON values.
      // We need to stringify it before sending it to AppSync to prevent type errors.
      const input = JSON.stringify(block.toolUse.input);
      return { toolUse: { ...block.toolUse, input } };
    }
    return block;
  });
  return {
    input: {
      conversationId,
      content: preparedContent,
      associatedUserMessageId,
    },
  };
};

const assistantResponseMutation = (event: ConversationTurnEvent): string => {
  const { responseMutationInputTypeName, responseMutationName } = event.args;
  return `
        mutation PublishModelResponse($input: ${responseMutationInputTypeName}!) {
            ${responseMutationName}(input: $input) {
                id
                conversationId
                content {
                  image {
                    format
                    source {
                      bytes
                    }
                  }
                  text
                  toolUse {
                    toolUseId
                    name
                    input
                  }
                  toolResult {
                    status
                    toolUseId
                    content {
                      json
                      text
                      image {
                        format
                        source {
                          bytes
                        }
                      }
                      document {
                        format
                        name
                        source {
                          bytes
                        }
                      }
                    }
                  }
                }
                role
                owner
                createdAt
                updatedAt
            }
        }
    `;
};

/**
 * TODO docs
 */
export class ConversationTurnResponder {
  /**
   * TODO docs
   */
  constructor(private readonly event: ConversationTurnEvent) { }

  respond = async (message: ContentBlock[]) => {
    const authHeader = this.event.request.headers.authorization;
    const { graphqlApiEndpoint } = this.event.args;
    // Construct mutation event sending assistant response to AppSync
    const query = assistantResponseMutation(this.event);
    const variables = assistantResponseInput(this.event, message);
    const options = assistantResponseRequestOptions(
      authHeader,
      query,
      variables
    );
    const request = new Request(graphqlApiEndpoint, options);
    // eslint-disable-next-line no-console
    console.log('Responding with:');
    // eslint-disable-next-line no-console
    console.log(request);
    const res = await fetch(request);
    const body = await res.json();
    // eslint-disable-next-line no-console
    console.log(body);
  };
}
