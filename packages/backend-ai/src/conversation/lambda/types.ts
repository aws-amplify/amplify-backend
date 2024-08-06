import {
  Message,
  ToolInputSchema,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentType as __DocumentType } from '@smithy/types';

export type ConversationTurnEvent = {
  typeName: string;
  fieldName: string;
  args: {
    conversationId: string;
    content: string;
    owner: string;
    modelId: string;
    responseMutationName: string;
    responseMutationInputTypeName: string;
    graphqlApiEndpoint: string;
    currentMessageId: string;
    systemPrompt: string;
    toolDefinitions?: Tools;
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
      items: Message[];
    };
  };
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  // TODO it seems that bedrock sometimes keeps asking a tool enough times to
  // make lambda time out, we should impose some configurable limits.
  invocationCountLimit?: number;
  execute: (
    input: __DocumentType | undefined
  ) => Promise<ToolResultContentBlock>;
};

// TODO: We need to also pass the selection set!
type Tools = {
  tools: ToolDefinition[];
}

type ToolDefinition = {
  toolSpec: ToolSpec;
}

type GraphQlRequestInputMetadata = {
  selectionSet: string[];
  propertyTypes: Record<string, string>;
};

export type ToolSpec = {
  name: string;
  description: string;
  gqlRequestInputMetadata?: GraphQlRequestInputMetadata;
  inputSchema: {
    json: {
      type: string;
      properties: Record<string, Property>;
      required: string[]
    };
  };
}

type Property = {
  type: string;
  description: string;
};
