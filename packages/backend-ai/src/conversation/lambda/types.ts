import { ToolInputSchema } from '@aws-sdk/client-bedrock-runtime';
import { ToolResultContentBlock } from '@aws-sdk/client-bedrock-runtime/dist-types/models/models_0';
import { DocumentType as __DocumentType } from "@smithy/types";

export type ConversationTurnEvent = {
  typeName: string;
  fieldName: string;
  args: {
    sessionId: string;
    content: string;
    owner: string;
    modelId: string;
    responseMutationName: string;
    responseMutationInputTypeName: string;
    graphqlApiEndpoint: string;
    currentMessageId: string;
    systemPrompt: string;
  };
  identity: {
    defaultAuthStrategy: 'ALLOW' | 'DENY';
    sub: string;
    username: string;
    claims: {
      sub: string;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      email_verified: boolean;
      iss: string;
    };
  };
  request: {
    headers: {
      authorization: string;
    };
  };
  prev: {
    result: {
      items: Array<{
        role: 'user' | 'assistant';
        content: { text: string }[];
      }>;
    };
  };
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute: (input: __DocumentType | undefined) => Promise<ToolResultContentBlock>;
};
