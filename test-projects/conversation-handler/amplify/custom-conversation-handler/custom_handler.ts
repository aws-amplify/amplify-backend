import {
  ConversationTurnEvent,
  ExecutableTool,
  ExecutableTool2,
  ExecutableTool3,
  ExecutableTool4,
  ExecutableTool5,
  ToolInputSchema,
  defineExecutableTool,
  handleConversationTurnEvent,
} from '@aws-amplify/ai-constructs/conversation/runtime';
import { ToolResultContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';

const thermometer: ExecutableTool = {
  name: 'thermometer',
  description: 'Returns current temperature in a city',
  execute: (input): Promise<ToolResultContentBlock> => {
    if (input && typeof input === 'object' && 'city' in input) {
      if (input.city === 'Seattle') {
        return Promise.resolve({
          text: `75F`,
        });
      }
    }
    return Promise.resolve({
      text: 'unknown',
    });
  },
  inputSchema: {
    json: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'The city name',
        },
      },
      required: ['city'],
    },
  },
};

/**
 * Handler with simple tool.
 */
export const handler = async (event: ConversationTurnEvent) => {
  await handleConversationTurnEvent(event, {
    tools: [thermometer],
  });
};

const dogSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    hobbies: { type: 'array', items: { type: 'string' } },
    favoriteFood: { enum: ['pizza', 'taco', 'fries'] },
  },
  required: ['name', 'age'],
} as const;

const theTool = defineExecutableTool('foo', 'bar', dogSchema, (input) => {
  console.log(input?.age);
  throw Error();
});


export const tool3: ExecutableTool3<typeof dogSchema> = {
  description: '',
  execute(input): Promise<ToolResultContentBlock> {
    console.log(input?.age);
    throw Error();
  },
  inputSchema: dogSchema,
  name: '',
};

export const tool2: ExecutableTool2<
  typeof dogSchema,
  FromSchema<typeof dogSchema>
> = {
  description: '',
  execute(input): Promise<ToolResultContentBlock> {
    console.log(input?.age);
    throw Error();
  },
  inputSchema: dogSchema,
  name: '',
};



type MyOwnType = {
  age: number;
  someThingCustom: string;
};

const someSchemaFromSomewhere: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    hobbies: { type: 'array', items: { type: 'string' } },
    favoriteFood: { enum: ['pizza', 'taco', 'fries'] },
  },
  required: ['name', 'age'],
};

const someSchemaFromSomewhere2 = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    hobbies: { type: 'array', items: { type: 'string' } },
    favoriteFood: { enum: ['pizza', 'taco', 'fries'] },
  },
  required: ['name', 'age'],
} as const satisfies JSONSchema;

export const tool4: ExecutableTool3<typeof someSchemaFromSomewhere2> = {
  description: '',
  execute(input): Promise<ToolResultContentBlock> {
    console.log(input?.age);
    throw Error();
  },
  inputSchema: dogSchema,
  name: '',
};

export const tool5: ExecutableTool3<JSONSchema, MyOwnType> = {
  description: '',
  execute(input): Promise<ToolResultContentBlock> {
    console.log(input?.age);
    throw Error();
  },
  inputSchema: dogSchema,
  name: '',
};

export const tool6: ExecutableTool4<MyOwnType> = {
  description: '',
  execute(input): Promise<ToolResultContentBlock> {
    console.log(input?.age);
    throw Error();
  },
  inputSchema: dogSchema as unknown as ToolInputSchema,
  name: '',
};

export const tool7: ExecutableTool4<FromSchema<typeof dogSchema>> = {
  description: '',
  execute(input): Promise<ToolResultContentBlock> {
    console.log(input?.age);
    throw Error();
  },
  inputSchema: dogSchema as unknown as ToolInputSchema,
  name: '',
};
