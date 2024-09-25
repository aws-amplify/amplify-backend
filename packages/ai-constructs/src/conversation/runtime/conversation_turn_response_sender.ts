import { ConversationTurnEvent } from './types.js';
import type { ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { GraphqlRequestExecutor } from './graphql_request_executor';

export type MutationResponseInput = {
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
    private readonly graphqlRequestExecutor = new GraphqlRequestExecutor(
      event.graphqlApiEndpoint,
      event.request.headers.authorization
    )
  ) {}

  sendResponse = async (message: ContentBlock[]) => {
    const { query, variables } = this.createMutationRequest(message);
    await this.graphqlRequestExecutor.executeGraphql<
      MutationResponseInput,
      void
    >({
      query,
      variables,
      onErrorMessage: 'Assistant response mutation request was not successful',
    });
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
    return { query, variables };
  };
}
