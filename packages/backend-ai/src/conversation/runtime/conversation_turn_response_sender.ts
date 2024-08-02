import { ConversationTurnEvent } from './types.js';

type AssistantMutationResponseInput = {
  input: {
    sessionId: string;
    content: string;
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
  content: string
): AssistantMutationResponseInput => {
  return {
    input: {
      sessionId: event.sessionId,
      content,
      associatedUserMessageId: event.currentMessageId,
    },
  };
};

const assistantResponseMutation = (event: ConversationTurnEvent): string => {
  const { responseMutationInputTypeName, responseMutationName } = event;
  return `
        mutation PublishModelResponse($input: ${responseMutationInputTypeName}!) {
            ${responseMutationName}(input: $input) {
                id
                sessionId
                content
                sender
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
export class ConversationTurnResponseSender {
  /**
   * TODO docs
   */
  constructor(private readonly event: ConversationTurnEvent) {}

  respond = async (message: string) => {
    const authHeader = this.event.request.headers.authorization;
    const { graphqlApiEndpoint } = this.event;
    // Construct mutation event sending assistant response to AppSync
    const query = assistantResponseMutation(this.event);
    const variables = assistantResponseInput(this.event, message);
    const options = assistantResponseRequestOptions(
      authHeader,
      query,
      variables
    );
    const request = new Request(graphqlApiEndpoint, options);
    const res = await fetch(request);
    const body = await res.json();
    console.log(body);
    if (!res.ok) {
      throw new Error(`Unable to send response ${JSON.stringify(body)}`);
    }
    if (body && typeof body === 'object' && 'errors' in body) {
      throw new Error(`Unable to send response ${JSON.stringify(body.errors)}`);
    }
  };
}
