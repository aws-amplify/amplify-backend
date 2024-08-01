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
  return {
    input: {
      conversationId: event.args.conversationId,
      content,
      associatedUserMessageId: event.args.currentMessageId,
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
  constructor(private readonly event: ConversationTurnEvent) {}

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

    console.log('Responding with:');
    console.log(request);
    const res = await fetch(request);
    const body = await res.json();
    console.log(body);
  };
}
