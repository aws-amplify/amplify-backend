import * as bedrock from '@aws-sdk/client-bedrock-runtime';
import * as jsonSchemaToTypeScript from 'json-schema-to-ts';

/*
  Notice: This file contains types that are exposed publicly.
  Therefore, we avoid eager introduction of types that wouldn't be useful for
  public API consumer and potentially pollute syntax assist in IDEs.
 */
export type JSONSchema = jsonSchemaToTypeScript.JSONSchema;
export type FromJSONSchema<TJSONSchema extends JSONSchema> =
  jsonSchemaToTypeScript.FromSchema<TJSONSchema>;
export type ToolInputSchema<TJSONSchema extends JSONSchema> = {
  json: TJSONSchema;
};
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
      // These are needed so that union with other content block types works.
      // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-bedrock-runtime/TypeAlias/ContentBlock/.
      text?: never;
      document?: never;
      toolUse?: never;
      toolResult?: never;
      guardContent?: never;
      $unknown?: never;
    };

export type ToolDefinition<TJSONSchema extends JSONSchema = JSONSchema> = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema<TJSONSchema>;
};

// Customers are not expected to create events themselves, therefore
// definition of nested properties is inline.
export type ConversationTurnEvent = {
  conversationId: string;
  currentMessageId: string;
  streamResponse?: boolean;
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
    headers: Record<string, string>;
  };
  messageHistoryQuery: {
    getQueryName: string;
    getQueryInputTypeName: string;
    listQueryName: string;
    listQueryInputTypeName: string;
    listQueryLimit?: number;
  };
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

export type ExecutableTool<
  TJSONSchema extends JSONSchema = JSONSchema,
  TToolInput = FromJSONSchema<TJSONSchema>
> = ToolDefinition<TJSONSchema> & {
  execute: (input: TToolInput) => Promise<ToolResultContentBlock>;
};

export type ConversationTurnError = {
  errorType: string;
  message: string;
};

export type StreamingResponseChunk = {
  // always required
  conversationId: string;
  associatedUserMessageId: string;
  contentBlockIndex: number;
  accumulatedTurnContent: Array<bedrock.ContentBlock>;
} & (
  | {
      // text chunk
      contentBlockText: string;
      contentBlockDeltaIndex: number;
      contentBlockDoneAtIndex?: never;
      contentBlockToolUse?: never;
      stopReason?: never;
    }
  | {
      // end of block. applicable to text blocks
      contentBlockDoneAtIndex: number;
      contentBlockText?: never;
      contentBlockDeltaIndex?: never;
      contentBlockToolUse?: never;
      stopReason?: never;
    }
  | {
      // tool use
      contentBlockToolUse: string; // serialized json with full tool use block
      contentBlockDoneAtIndex?: never;
      contentBlockText?: never;
      contentBlockDeltaIndex?: never;
      stopReason?: never;
    }
  | {
      // turn complete
      stopReason: string;
      contentBlockDoneAtIndex?: never;
      contentBlockText?: never;
      contentBlockDeltaIndex?: never;
      contentBlockToolUse?: never;
    }
);
