import {
  ToolInputSchema,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from '@smithy/types';

/*
  Notice: This file contains types that are exposed publicly.
  Therefore, we avoid eager introduction of types that wouldn't be useful for
  public API consumer and potentially pollute syntax assist in IDEs.
 */

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: Array<ConversationMessageContentBlock>;
};

export type ConversationMessageContentBlock = {
  text: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
};

// Customers are not expected to create events themselves, therefore
// definition of nested properties is inline.
export type ConversationTurnEvent = {
  conversationId: string;
  currentMessageId: string;
  responseMutationName: string;
  responseMutationInputTypeName: string;
  graphqlApiEndpoint: string;
  modelConfiguration: {
    modelId: string;
    systemPrompt: string;
    region?: string;
  };
  request: {
    headers: {
      authorization: string;
    };
  };
  messages: Array<ConversationMessage>;
  toolsConfiguration?: {
    dataTools?: Array<
      ToolDefinition & {
        graphqlRequestInputDescriptor: {
          queryName: string;
          selectionSet: string[];
          propertyTypes: Record<string, string>;
        };
      }
    >;
    clientTools?: Array<ToolDefinition>;
  };
};

export type ExecutableTool = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute: (input: DocumentType | undefined) => Promise<ToolResultContentBlock>;
};
