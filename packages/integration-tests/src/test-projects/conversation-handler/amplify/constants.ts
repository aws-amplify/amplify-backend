/*
 * This file contains constants shared between test project and test.
 */

/**
 * A model used in conversation handler test project.
 * See https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html for available models.
 */
export const bedrockModelId = 'anthropic.claude-3-haiku-20240307-v1:0';

export const expectedTemperaturesInProgrammaticToolScenario = {
  Seattle: 75,
  Boston: 58,
};

export const expectedTemperatureInDataToolScenario = 85;

export const expectedRandomNumber = 42;
