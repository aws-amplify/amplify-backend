import { expectedTemperatureInDataToolScenario } from '../constants.js';

/**
 * Returns temperature.
 */
export const handler = async () => {
  return {
    // We use this value in test assertion.
    // LLM uses tool to get temperature and serves this value in final response.
    // We're matching number only as LLM may translate unit to something more descriptive.
    value: expectedTemperatureInDataToolScenario,
    unit: 'F',
  };
};
