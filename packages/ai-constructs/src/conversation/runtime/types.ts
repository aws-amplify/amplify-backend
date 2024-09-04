import * as bedrock from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from '@smithy/types';

/*
  Notice: This file contains types that are exposed publicly.
  Therefore, we avoid eager introduction of types that wouldn't be useful for
  public API consumer and potentially pollute syntax assist in IDEs.
 */

export type ToolInputSchema = bedrock.ToolInputSchema;
export type ToolResultContentBlock = bedrock.ToolResultContentBlock;

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: Array<ConversationMessageContentBlock>;
};

export type ConversationMessageContentBlock =
  | bedrock.ContentBlock
  | {
      image: Omit<bedrock.ImageBlock, 'source'> & {
        // Upstream (Appsync) may send images in a form of Base64 encoded strings
        source: { bytes: string };
      };
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
  responseMutation: {
    name: string;
    inputTypeName: string;
    selectionSet: string;
  };
  graphqlApiEndpoint: string;
  modelConfiguration: {
    modelId: string;
    systemPrompt: string;
    region?: string;
    inferenceConfiguration?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    };
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
          selectionSet: string;
          propertyTypes: Record<string, string>;
        };
      }
    >;
    clientTools?: Array<ToolDefinition>;
  };
};

export type ExecutableTool = ToolDefinition & {
  execute: (input: DocumentType | undefined) => Promise<ToolResultContentBlock>;
};
