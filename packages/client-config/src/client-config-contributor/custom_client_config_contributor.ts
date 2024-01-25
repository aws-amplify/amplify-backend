import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { CustomClientConfig } from '../client-config-types/client_config.js';

// TODO: these types are copied, should be moved to platform-types perhaps.
export type ClientConfigDestination = {
  clientConfigFormat: string;
  path: Array<string>;
}

export type CustomOutputOptions = {
  clientConfigDestinations?: Array<ClientConfigDestination>
}

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

    const result: CustomClientConfig & Record<string, unknown> = { custom: {} };

    Object.entries(customOutputs.payload).forEach(([key, value]) => {
      const customOutputData = JSON.parse(value);
      // TODO how do we do custom namespacing ??
      result.custom[key.replace('amplifycustom', '')] = customOutputData.value;

      const customOutputOptions: CustomOutputOptions | undefined = customOutputData.options;

      if (customOutputOptions){
        customOutputOptions.clientConfigDestinations?.forEach(clientConfigDestination => {
          let currentRef: Record<string, unknown> = result;
          for (let i = 0 ; i < clientConfigDestination.path.length - 1; i++) {
            const pathSegment = clientConfigDestination.path[i];
            if (!currentRef[pathSegment]) {
              currentRef[pathSegment] = {}
            }
            currentRef = currentRef[pathSegment] as Record<string, unknown>;
          }
          const lastPathSegment = clientConfigDestination.path[clientConfigDestination.path.length - 1];
          currentRef[lastPathSegment] = customOutputData.value;
        });
      }
    });

    console.log(result);

    return result;
  };
}
