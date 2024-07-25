import { ConversationTurnEvent } from './types';

type AssistantMutationResponseInput = {
  input: {
    conversationId: string;
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
      conversationId: event.args.sessionId,
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
export class ConversationTurnResponder {
  /**
   * TODO docs
   */
  constructor(private readonly event: ConversationTurnEvent) {}

  respond = async (message: string) => {
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
