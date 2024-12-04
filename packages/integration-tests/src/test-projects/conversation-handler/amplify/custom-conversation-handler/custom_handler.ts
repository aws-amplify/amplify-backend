import {
  ConversationTurnEvent,
  createExecutableTool,
  handleConversationTurnEvent,
} from '@aws-amplify/backend-ai/conversation/runtime';
import {
  expectedRandomNumber,
  expectedTemperaturesInProgrammaticToolScenario,
} from '../constants.js';

const thermometerInputSchema = {
  type: 'object',
  properties: {
    city: { type: 'string' },
  },
  required: ['city'],
} as const;

const thermometer = createExecutableTool(
  'thermometer',
  'Returns current temperature in cities',
  {
    json: thermometerInputSchema,
  },
  (input) => {
    const city = input.city;
    if (city === 'Seattle' || city === 'Boston') {
      return Promise.resolve({
        // We use this value in test assertion.
        // LLM uses tool to get temperature and serves this value in final response.
        // We're matching number only as LLM may translate unit to something more descriptive.
        text: `${expectedTemperaturesInProgrammaticToolScenario[city]}F`,
      });
    }
    throw new Error(`Unknown city ${input.city}`);
  }
);

// Parameter-less tool.
const randomNumberGeneratorInputSchema = {
  type: 'object',
  properties: {},
  required: [],
} as const;

const randomNumberGenerator = createExecutableTool(
  'randomNumberGenerator',
  'Returns a random number',
  {
    json: randomNumberGeneratorInputSchema,
  },
  () => {
    return Promise.resolve({
      // We use this value in test assertion.
      text: `${expectedRandomNumber}`,
    });
  }
);

/**
 * Handler with simple tool.
 */
export const handler = async (event: ConversationTurnEvent) => {
  await handleConversationTurnEvent(event, {
    tools: [randomNumberGenerator, thermometer],
  });
};
