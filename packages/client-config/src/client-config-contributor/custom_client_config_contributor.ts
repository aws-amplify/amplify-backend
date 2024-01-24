import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { CustomClientConfig } from '../client-config-types/client_config.js';

export class CustomClientConfigContributor implements ClientConfigContributor {
  contribute = async ({
    ['AWS::Amplify::Custom']: customOutputs,
  }: UnifiedBackendOutput): Promise<
    CustomClientConfig | Record<string, never>
  > => {
    if (
      customOutputs === undefined ||
      Object.keys(customOutputs.payload).length === 0
    ) {
      console.log('custom outputs undefined');
      return {};
    }

    console.log(customOutputs);

    const result: CustomClientConfig = { custom: {} };

    Object.entries(customOutputs.payload).forEach(([key, value]) => {
      // TODO how do we do custom namespacing ??
      const customOutputData = JSON.parse(value);
      result.custom[key.replace('amplifycustom', '')] = customOutputData.value;
    });

    console.log(result);

    return result;
  };
}
