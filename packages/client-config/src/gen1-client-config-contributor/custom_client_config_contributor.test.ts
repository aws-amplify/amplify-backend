import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CustomClientConfigContributor } from './custom_client_config_contributor.js';
import {
  UnifiedBackendOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client-config-types/client_config.js';

void describe('Custom client config contributor', () => {
  const customClientConfigContributor = new CustomClientConfigContributor();

  void it('contributes custom output when present', () => {
    const customOutputs: Partial<ClientConfig> = {
      aws_user_pools_id: 'userPoolId',
      custom: {
        output1: 'val1',
        output2: 'val2',
      },
    };
    const backendOutput: UnifiedBackendOutput = {
      [customOutputKey]: {
        version: '1',
        payload: {
          customOutputs: JSON.stringify(customOutputs),
        },
      },
    };

    const contribution =
      customClientConfigContributor.contribute(backendOutput);

    assert.deepEqual(contribution, customOutputs);
  });

  void it('contributes empty if no custom outputs are present', () => {
    const backendOutput: UnifiedBackendOutput = {};

    const contribution =
      customClientConfigContributor.contribute(backendOutput);

    assert.deepEqual(contribution, {});
  });
});
