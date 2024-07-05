import type {
  ContentBlock,
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

export type Prompt = {
  text: string;
};

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

export type ToolUseBlock = {
  toolUseId: string;
  name: string;
  input: JSONLike;
};

export type Message = {
  role: 'user' | 'assistant';
  content: SupportedMessageContentBlock[];
};

export type Tool = ToolSpecification & {
  type: 'custom' | 'ui';
  use: (
    args: JSONLike
  ) => Promise<
    (
      | SupportedToolResultsTextContent
      | SupportedToolResultsImageContent
      | SupportedToolResultsJsonContent
    )[]
  >;
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

export type GetMessageInput = {
  systemPrompts: Prompt[];
  messages: Message[];
  modelId: string;
  tools?: Tool[];
  toolUseStrategy?: ToolUseStrategy;
};

export type GetMessageOutput = {
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
