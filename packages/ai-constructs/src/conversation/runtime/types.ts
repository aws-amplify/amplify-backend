import {
  ToolInputSchema,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from '@smithy/types';

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: Array<ConversationMessageContentBlock>;
};

export type ConversationMessageContentBlock = {
  text: string;
};

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
    tools: Array<{
      name: string;
      description?: string;
      inputSchema: ToolInputSchema;
      graphqlRequestInputDescriptor: {
        queryName: string;
        selectionSet: string[];
        propertyTypes: Record<string, string>;
      };
    }>;
  };
};

export type ExecutableTool = {
  name: string;
  description?: string;
  inputSchema: ToolInputSchema;
  execute: (input: DocumentType | undefined) => Promise<ToolResultContentBlock>;
};
