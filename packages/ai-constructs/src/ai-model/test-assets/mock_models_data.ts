<<<<<<< HEAD
<<<<<<< HEAD
import { AiModelsManifest } from '../ai_model_types';

export const mockModelsData: AiModelsManifest = {
=======
import { AiModelsJson } from '../ai_model_types';

export const mockModelsData: AiModelsJson = {
>>>>>>> 5399894242 (feat: add mock data and resolver for AI model properties)
=======
import { AiModelsManifest } from '../ai_model_types';

export const mockModelsData: AiModelsManifest = {
>>>>>>> d74e9c107b (change AiModelsJson to AiModelsManifest)
  schemaVersion: 1,
  lastUpdated: '2025-01-01',
  regionGroups: {
    us: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'],
    eu: ['eu-central-1', 'eu-west-1', 'eu-west-3'],
    // eslint-disable-next-line spellcheck/spell-checker
    apac: ['ap-northeast-1', 'ap-southeast-1', 'ap-south-1'],
  },
  models: {
    testModelId1: {
      geographies: {
        us: {
          inferenceProfileId: 'us.testModelId1',
          supportsCriFrom: ['us-east-1', 'us-west-2'],
          requiresCriIn: ['us-east-2'],
        },
        eu: {
          inferenceProfileId: 'eu.testModelId1',
          supportsCriFrom: ['eu-west-1'],
          requiresCriIn: [],
        },
      },
    },
    testModelId2: {
      geographies: {
        us: {
          inferenceProfileId: null,
          supportsCriFrom: [],
          requiresCriIn: [],
        },
      },
    },
  },
};

export const TEST_MODEL_IDS = {
  FOUNDATION: 'testModelId1',
  INF_PROFILE_US: 'us.testModelId1',
  INF_PROFILE_EU: 'eu.testModelId1',
  NO_CRI_MODEL: 'testModelId2',
  UNKNOWN_MODEL: 'unknownModelId',
} as const;
