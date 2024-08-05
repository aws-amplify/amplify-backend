import { ConversationTurnEvent } from './types.js';
import { ContentBlock } from '@aws-sdk/client-bedrock-runtime';

type MutationResponseInput = {
  input: {
    conversationId: string;
    content: ContentBlock[];
    associatedUserMessageId: string;
  };
};

/**
 * TODO docs
 */
export class ConversationTurnResponseSender {
  /**
   * TODO docs
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly _fetch = fetch
  ) {}

  sendResponse = async (message: ContentBlock[]) => {
    const request = this.createMutationRequest(message);
    const res = await this._fetch(request);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Assistant response mutation request was not successful response headers=${JSON.stringify(
          res.headers
        )}, body=${body}`
      );
    }
    const body = await res.json();
    if (body && typeof body === 'object' && 'errors' in body) {
      throw new Error(
        `Assistant response mutation request was not successful response headers=${JSON.stringify(
          res.headers
        )}, body=${JSON.stringify(body)}`
      );
    }
  };

  private createMutationRequest = (content: ContentBlock[]) => {
    const query = `
        mutation PublishModelResponse($input: ${this.event.responseMutationInputTypeName}!) {
            ${this.event.responseMutationName}(input: $input) {
                id
                conversationId
                content
                sender
                owner
                createdAt
                updatedAt
            }
        }
    `;
    const variables: MutationResponseInput = {
      input: {
        conversationId: this.event.conversationId,
        content,
        associatedUserMessageId: this.event.currentMessageId,
      },
    };
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
