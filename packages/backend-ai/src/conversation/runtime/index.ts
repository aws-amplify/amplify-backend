import * as runtime from '@aws-amplify/ai-constructs/conversation/runtime';
import { DocumentType } from '@smithy/types';

// Re-export types useful for lambda runtime customization.
// Some of these types are partially re-defined so that their member use
// symbols from same package.

export type ToolResultContentBlock = runtime.ToolResultContentBlock;
export type ExecutableTool = runtime.ToolDefinition & {
  execute: (input: DocumentType | undefined) => Promise<ToolResultContentBlock>;
};
export type ConversationTurnEvent = runtime.ConversationTurnEvent;

export const handleConversationTurnEvent: (
  event: ConversationTurnEvent,
  props?: { tools?: Array<ExecutableTool> }
) => Promise<void> = runtime.handleConversationTurnEvent;
