import { ConversationTurnEvent } from './types.js';
import { GraphqlRequestExecutor } from './graphql_request_executor';

export type StreamingResponseChunk = {
  // always required
  conversationId: string;
  associatedUserMessageId: string;
  contentBlockIndex: number;
  assistantMessageIndex: number;
} & (
  | {
      // text chunk
      contentBlockText: string;
      contentBlockDeltaIndex: number;
    }
  | {
      // end of block. applicable to text blocks
      contentBlockDoneAtIndex: number;
    }
  | {
      // tool use
      contentBlockToolUse: string; // serialized json with full tool use block
    }
  | {
      // turn complete
      stopReason: string;
    }
);

type MutationStreamingResponseInput = {
  input: StreamingResponseChunk;
};

/**
 * This class is responsible for sending response chunks produced by Bedrock back to AppSync
 * in a form of mutation.
 */
export class ConversationTurnStreamingResponseSender {
  /**
   * Creates conversation turn response sender.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly graphqlRequestExecutor = new GraphqlRequestExecutor(
      event.graphqlApiEndpoint,
      event.request.headers.authorization,
      event.request.headers['x-amz-user-agent']
    ),
    private readonly logger = console
  ) {}

  sendResponseChunk = async (chunk: StreamingResponseChunk) => {
    const responseMutationRequest = this.createMutationRequest(chunk);
    this.logger.debug('Sending response mutation:', responseMutationRequest);
    await this.graphqlRequestExecutor.executeGraphql<
      MutationStreamingResponseInput,
      void
    >(responseMutationRequest);
  };

  private createMutationRequest = (chunk: StreamingResponseChunk) => {
    const query = `
        mutation PublishModelResponse($input: ${this.event.responseMutation.inputTypeName}!) {
            ${this.event.responseMutation.name}(input: $input) {
                ${this.event.responseMutation.selectionSet}
            }
        }
    `;
    const variables: MutationStreamingResponseInput = {
      input: chunk,
    };
    return { query, variables };
  };
}
