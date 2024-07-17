import type {
  ContentBlock,
  SystemContentBlock,
  ToolChoice,
  ToolResultContentBlock,
  ToolSpecification,
} from '@aws-sdk/client-bedrock-runtime';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, K extends keyof T> = T extends any
  ? Omit<T, K>
  : never;

export type SupportedMessageContentBlock = DistributiveOmit<
  | ContentBlock.TextMember
  | ContentBlock.ImageMember
  | ContentBlock.ToolResultMember
  | ContentBlock.ToolUseMember,
  '$unknown' | 'document' | 'guardContent'
>;

export type JSONLike =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONLike }
  | JSONLike[];

export type JSONSchema = {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number | boolean | null)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  description?: string;
  default?: JSONLike;
  additionalProperties?: boolean | JSONSchema;
};

export type SystemPromptContent = Omit<
  SystemContentBlock.TextMember,
  '$unknown' | 'guardContent'
>;

export type SupportedToolResultsTextContent = Pick<
  ToolResultContentBlock.TextMember,
  'text'
>;
export type SupportedToolResultsImageContent = Pick<
  ToolResultContentBlock.ImageMember,
  'image'
>;
export type SupportedToolResultsJsonContent = Pick<
  ToolResultContentBlock.JsonMember,
  'json'
>;

export type SupportedToolResultContentBlock =
  | SupportedToolResultsTextContent
  | SupportedToolResultsImageContent
  | SupportedToolResultsJsonContent;

export type AIMessage = {
  role: 'user' | 'assistant';
  content: SupportedMessageContentBlock[];
};

export type ConversationMessage = AIMessage & {
  id: string;
  sessionId: string;
};

export type Tool = ToolSpecification & {
  type: 'custom' | 'ui';
  use: (args: JSONLike) => Promise<SupportedToolResultContentBlock[]>;
};

export type ToolUseStrategy =
  | {
      strategy: 'any';
    }
  | {
      strategy: 'specific';
      name: string;
    };

export type SupportedToolChoice = DistributiveOmit<
  ToolChoice.AnyMember | ToolChoice.AutoMember | ToolChoice.ToolMember,
  '$unknown'
>;

export type GetConversationMessageWithoutResolvingToolUsageInput = {
  systemPrompts: SystemPromptContent[];
  messages: Omit<AIMessage[], 'id' | 'sessionId'>;
  modelId: string;
  toolConfiguration?: {
    tools?: Tool[];
    toolUseStrategy?: ToolUseStrategy;
  };
};

export type GetConversationMessageWithoutResolvingToolUsageOutput = {
  output: {
    message: {
      role: 'user' | 'assistant';
      content: SupportedMessageContentBlock[];
    };
  };
  stopReason:
    | 'end_turn'
    | 'tool_use'
    | 'max_tokens'
    | 'stop_sequence'
    | 'guardrail_intervened'
    | 'content_filtered';
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  metrics: {
    latencyMs?: number;
  };
  additionalModelResponseFields?: JSONLike;
};

export type GetConversationMessageInput = {
  systemPrompts: SystemPromptContent[];
  messages: AIMessage[];
  modelId: string;
  onToolUseMessage?: (message: AIMessage) => Promise<void>;
  onToolResultMessage?: (message: AIMessage) => Promise<void>;
  toolConfiguration: {
    tools?: Tool[];
    toolUseStrategy?: ToolUseStrategy;
  };
};
