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
 * This class is responsible for sending a response produced by Bedrock back to AppSync
 * in a form of mutation.
 */
export class ConversationTurnResponseSender {
  /**
   * Creates conversation turn response sender.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly _fetch = fetch
  ) {}

  sendResponse = async (message: ContentBlock[]) => {
    const request = this.createMutationRequest(message);
    const res = await this._fetch(request);
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => (responseHeaders[key] = value));
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Assistant response mutation request was not successful, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${body}`
      );
    }
    const body = await res.json();
    if (body && typeof body === 'object' && 'errors' in body) {
      throw new Error(
        `Assistant response mutation request was not successful, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${JSON.stringify(body)}`
      );
    }
  };

  private createMutationRequest = (content: ContentBlock[]) => {
    const query = `
        mutation PublishModelResponse($input: ${this.event.responseMutation.inputTypeName}!) {
            ${this.event.responseMutation.name}(input: $input) {
                ${this.event.responseMutation.selectionSet}
            }
        }
    `;
    content = content.map((block) => {
      if (block.toolUse) {
        // The `input` field is typed as `AWS JSON` in the GraphQL API because it can represent
        // arbitrary JSON values.
        // We need to stringify it before sending it to AppSync to prevent type errors.
        const input = JSON.stringify(block.toolUse.input);
        return { toolUse: { ...block.toolUse, input } };
      }
      return block;
    });
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
