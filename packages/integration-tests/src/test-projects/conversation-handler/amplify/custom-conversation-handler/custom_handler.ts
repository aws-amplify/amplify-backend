import {
  ConversationTurnEvent,
  ExecutableTool,
  ToolResultContentBlock,
  handleConversationTurnEvent,
} from '@aws-amplify/backend-ai/conversation/runtime';
import { expectedTemperatureInProgrammaticToolScenario } from '../constants.js';

const thermometer: ExecutableTool = {
  name: 'thermometer',
  description: 'Returns current temperature in Seattle',
  execute: (): Promise<ToolResultContentBlock> => {
    return Promise.resolve({
      // We use this value in test assertion.
      // LLM uses tool to get temperature and serves this value in final response.
      // We're matching number only as LLM may translate unit to something more descriptive.
      text: `${expectedTemperatureInProgrammaticToolScenario}F`,
    });
  },
  inputSchema: { json: { type: 'object' } },
};

/**
 * Handler with simple tool.
 */
export const handler = async (event: ConversationTurnEvent) => {
  await handleConversationTurnEvent(event, {
    tools: [thermometer],
  });
};
