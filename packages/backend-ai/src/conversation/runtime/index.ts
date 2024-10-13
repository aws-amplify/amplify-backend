import * as runtime from '@aws-amplify/ai-constructs/conversation/runtime';

// Re-export types useful for lambda runtime customization.
// Some of these types are partially re-defined so that their member use
// symbols from same package.

export type ToolResultContentBlock = runtime.ToolResultContentBlock;
export type ExecutableTool<
  TJSONSchema extends runtime.JSONSchema = runtime.JSONSchema,
  TToolInput = runtime.FromJSONSchema<TJSONSchema>
> = runtime.ToolDefinition<TJSONSchema> & {
  execute: (input: TToolInput) => Promise<ToolResultContentBlock>;
};
export type ConversationTurnEvent = runtime.ConversationTurnEvent;

export const handleConversationTurnEvent: (
  event: ConversationTurnEvent,
  // This is by design, so that tools with different input types can be added
  // to single arrays. Downstream code doesn't use these types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: { tools?: Array<ExecutableTool<runtime.JSONSchema, any>> }
) => Promise<void> = runtime.handleConversationTurnEvent;

export const createExecutableTool: <
  TJSONSchema extends runtime.JSONSchema = runtime.JSONSchema,
  TToolInput = runtime.FromJSONSchema<TJSONSchema>
>(
  name: string,
  description: string,
  inputSchema: runtime.ToolInputSchema<TJSONSchema>,
  handler: (input: TToolInput) => Promise<ToolResultContentBlock>
) => ExecutableTool<TJSONSchema, TToolInput> = runtime.createExecutableTool;
