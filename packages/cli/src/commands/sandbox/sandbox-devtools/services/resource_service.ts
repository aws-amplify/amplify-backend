import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { DeployedBackendClient } from '@aws-amplify/deployed-backend-client';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { RegionFetcher } from '@aws-amplify/platform-core';
import { createFriendlyName } from '../logging/cloudformation_format.js';

import {
  ResourceWithFriendlyName,
  getAwsConsoleUrl,
  isCompleteResource,
} from '../resource_console_functions.js';

/**
 * Type for deployed backend resources response
 */
export type DeployedBackendResources = {
  name: string;
  status: string;
  resources: ResourceWithFriendlyName[];
  region: string | null;
  message?: string;
};

/**
 * Service for managing backend resources
 */
export class ResourceService {
  /**
   * Creates a new ResourceService
   */
  constructor(
    private readonly backendName: string,
    private readonly backendClient: DeployedBackendClient,
    private readonly namespace: string = 'amplify-backend', // Add namespace parameter with default
    private readonly regionFetcher: RegionFetcher = new RegionFetcher(),
    private readonly printer: Printer = printerUtil,
  ) {}

  /**
   * Gets the deployed backend resources
   * @returns The deployed backend resources with friendly names
   */
  public async getDeployedBackendResources(): Promise<DeployedBackendResources> {
    try {
      try {
        this.printer.log('Fetching backend metadata...', LogLevel.DEBUG);
        // Create a BackendIdentifier object for the sandbox
        const backendId: BackendIdentifier = {
          namespace: this.namespace, // Use the provided namespace
          name: this.backendName,
          type: 'sandbox',
        };
        const data = await this.backendClient.getBackendMetadata(backendId);
        this.printer.log(
          'Successfully fetched backend metadata',
          LogLevel.DEBUG,
        );

        // Get the AWS region using RegionFetcher
        let region: string | null = null;
        try {
          region = (await this.regionFetcher.fetch()) ?? null;
        } catch (error) {
          this.printer.log('Error getting region: ' + error, LogLevel.ERROR);
          region = null;
        }

        // Process resources and add friendly names
        const resourcesWithFriendlyNames = data.resources
          .filter(isCompleteResource)
          .map((resource) => {
            let resourceType = resource.resourceType;

            // Remove CUSTOM:: prefix from resource type
            if (resourceType.startsWith('CUSTOM::')) {
              resourceType = resourceType.substring(8); // Remove "CUSTOM::" (8 characters)
            } else if (resourceType.startsWith('Custom::')) {
              resourceType = resourceType.substring(8); // Remove "Custom::" (8 characters)
            }

            // Check if the resource has metadata with a construct path
            // Use a type guard to check if the resource has a metadata property
            let metadata = undefined;

            if ('metadata' in resource) {
              if (
                typeof resource.metadata === 'object' &&
                resource.metadata !== null &&
                'constructPath' in resource.metadata
              ) {
                metadata = {
                  constructPath: resource.metadata.constructPath as string,
                };
              }
            }

            const resourceWithFriendlyName = {
              ...resource,
              resourceType,
              friendlyName: createFriendlyName(
                resource.logicalResourceId,
                metadata,
              ),
            } as ResourceWithFriendlyName;

            // Add console URL
            resourceWithFriendlyName.consoleUrl = getAwsConsoleUrl(
              resourceWithFriendlyName,
              region,
            );

            return resourceWithFriendlyName;
          });

        // Add region and resources with friendly names to the data
        const enhancedData = {
          ...data,
          region,
          resources: resourcesWithFriendlyNames,
        };

        return enhancedData;
      } catch (error) {
        const errorMessage = String(error);
        this.printer.log(
          `Error getting backend resources: ${errorMessage}`,
          LogLevel.ERROR,
        );

        // Check if this is a deployment in progress error
        if (errorMessage.includes('deployment is in progress')) {
          return {
            name: this.backendName,
            status: 'deploying',
            resources: [],
            region: null,
            message:
              'Sandbox deployment is in progress. Resources will update when deployment completes.',
          };
        } else if (errorMessage.includes('does not exist')) {
          // If the stack doesn't exist, return empty resources
          return {
            name: this.backendName,
            status: 'nonexistent',
            resources: [],
            region: null,
            message: 'No sandbox exists. Please create a sandbox first.',
          };
        }
        // For other errors, throw the error
        throw error;
      }
    } catch (error) {
      this.printer.log(
        `Error checking sandbox status: ${String(error)}`,
        LogLevel.ERROR,
      );
      throw error;
    }
  }
}
