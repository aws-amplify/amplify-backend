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

export type ContentBlock =
  | TextContent
  | ImageContent
  | DocumentContent
  | ToolUseContent
  | ToolResultContent
  | GuardContentContent
  | $UnknownContent;

export type TextContent = {
  text: string;
  image?: never;
  document?: never;
  toolUse?: never;
  toolResult?: never;
  guardContent?: never;
  $unknown?: never;
};

export type ImageContent = {
  text?: never;
  image: ImageBlock;
  document?: never;
  toolUse?: never;
  toolResult?: never;
  guardContent?: never;
  $unknown?: never;
};

export type DocumentContent = {
  text?: never;
  image?: never;
  document: DocumentBlock;
  toolUse?: never;
  toolResult?: never;
  guardContent?: never;
  $unknown?: never;
};

export type ToolUseContent = {
  text?: never;
  image?: never;
  document?: never;
  toolUse: ToolUseBlock;
  toolResult?: never;
  guardContent?: never;
  $unknown?: never;
};

export type ToolResultContent = {
  text?: never;
  image?: never;
  document?: never;
  toolUse?: never;
  toolResult: ToolResultBlock;
  guardContent?: never;
  $unknown?: never;
};

export type GuardContentContent = {
  text?: never;
  image?: never;
  document?: never;
  toolUse?: never;
  toolResult?: never;
  guardContent: GuardrailConverseContentBlock;
  $unknown?: never;
};
export type $UnknownContent = {
  text?: never;
  image?: never;
  document?: never;
  toolUse?: never;
  toolResult?: never;
  guardContent?: never;
  $unknown?: [string];
};

export type ImageBlock = {
  format: 'png' | 'jpeg' | 'gif' | 'webp'; // eslint-disable-line spellcheck/spell-checker
  source: {
    bytes: Uint8Array;
  };
};

export type DocumentBlock = {
  format:
    | 'pdf'
    | 'csv'
    | 'doc'
    | 'docx'
    | 'xls'
    | 'xlsx'
    | 'html'
    | 'txt'
    | 'md';
  name: string;
  source: {
    bytes: Uint8Array;
  };
};

export type ToolUseBlock = {
  toolUseId: string;
  name: string;
  input: JSONLike;
};

export type ToolResultBlock = {
  toolUseId: string;
  content: ContentBlock[];
  status?: 'success' | 'error';
};

export type GuardrailConverseContentBlock = {
  text: {
    text: string;
  };
};

export type Message = {
  role: 'user' | 'assistant';
  content: ContentBlock[];
};

export type Tool = {
  name: string;
  type: 'custom' | 'ui';
  inputSchema: {
    json: JSONSchema;
  };
  description?: string;
  use?: (
    args: JSONLike
  ) => Promise<TextContent | ImageContent | ToolResultContent>;
};

export type GetMessageInput = {
  systemPrompts: Prompt[];
  messages: Message[];
  modelId: string;
  tools?: Tool[];
};

export type GetMessageOutput = {
  output: {
    message: {
      role: 'user' | 'assistant';
      content: ContentBlock[];
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
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metrics: {
    latencyMs: number;
  };
  additionalModelResponseFields?: JSONLike;
};
