## API Report File for "@aws-amplify/backend-ai"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { ConstructFactory } from '@aws-amplify/plugin-types';
import { FunctionResources } from '@aws-amplify/plugin-types';
import { ResourceProvider } from '@aws-amplify/plugin-types';
import * as runtime from '@aws-amplify/ai-constructs/conversation/runtime';

declare namespace __export__conversation {
    export {
        DefineConversationHandlerFunctionProps,
        defineConversationHandlerFunction
    }
}
export { __export__conversation }

declare namespace __export__conversation__runtime {
    export {
        ToolResultContentBlock,
        ExecutableTool,
        ConversationTurnEvent,
        handleConversationTurnEvent,
        createExecutableTool
    }
}
export { __export__conversation__runtime }

// @public (undocumented)
type ConversationTurnEvent = runtime.ConversationTurnEvent;

// @public (undocumented)
const createExecutableTool: <TJSONSchema extends runtime.JSONSchema = runtime.JSONSchema, TToolInput = runtime.FromJSONSchema<TJSONSchema>>(name: string, description: string, inputSchema: runtime.ToolInputSchema<TJSONSchema>, handler: (input: TToolInput) => Promise<ToolResultContentBlock>) => ExecutableTool<TJSONSchema, TToolInput>;

// @public
const defineConversationHandlerFunction: (props: DefineConversationHandlerFunctionProps) => ConstructFactory<ResourceProvider<FunctionResources>>;

// @public (undocumented)
type DefineConversationHandlerFunctionProps = {
    name: string;
    entry?: string;
    models: Array<{
        modelId: string | {
            resourcePath: string;
        };
        region?: string;
    }>;
};

// @public (undocumented)
type ExecutableTool<TJSONSchema extends runtime.JSONSchema = runtime.JSONSchema, TToolInput = runtime.FromJSONSchema<TJSONSchema>> = runtime.ToolDefinition<TJSONSchema> & {
    execute: (input: TToolInput) => Promise<ToolResultContentBlock>;
};

// @public (undocumented)
const handleConversationTurnEvent: (event: ConversationTurnEvent, props?: {
    tools?: Array<ExecutableTool<runtime.JSONSchema, any>>;
}) => Promise<void>;

// @public (undocumented)
type ToolResultContentBlock = runtime.ToolResultContentBlock;

// (No @packageDocumentation comment for this package)

```