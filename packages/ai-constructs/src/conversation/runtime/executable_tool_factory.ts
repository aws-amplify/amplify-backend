import {
  ExecutableTool,
  FromJSONSchema,
  JSONSchema,
  ToolInputSchema,
} from './types';
import * as bedrock from '@aws-sdk/client-bedrock-runtime';

/**
 * Creates an executable tool.
 */
export const createExecutableTool = <
  TJSONSchema extends JSONSchema = JSONSchema,
  TToolInput = FromJSONSchema<TJSONSchema>
>(
  name: string,
  description: string,
  inputSchema: ToolInputSchema<TJSONSchema>,
  handler: (
    input: TToolInput | undefined
  ) => Promise<bedrock.ToolResultContentBlock>
): ExecutableTool<TJSONSchema, TToolInput> => {
  return {
    name,
    description,
    inputSchema,
    execute: handler,
  };
};
