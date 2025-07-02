import { LogLevel, printer } from '@aws-amplify/cli-core';
import {
  DeployedBackendClient,
  DeployedBackendClientFactory,
} from '@aws-amplify/deployed-backend-client';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
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
  private backendClient: DeployedBackendClient;

  /**
   * Creates a new ResourceService
   */
  constructor(
    private backendName: string,
    private getSandboxState: () => Promise<string>,
    private namespace: string = 'amplify-backend', // Add namespace parameter with default
  ) {
    // Initialize the backend client
    this.backendClient = new DeployedBackendClientFactory().getInstance({
      getS3Client: () => new S3Client(),
      getAmplifyClient: () => new AmplifyClient(),
      getCloudFormationClient: () => new CloudFormationClient(),
    });
  }

  /**
   * Gets the deployed backend resources
   * @returns The deployed backend resources with friendly names
   */
  public async getDeployedBackendResources(): Promise<DeployedBackendResources> {
    try {
      try {
        printer.log('Fetching backend metadata...', LogLevel.DEBUG);
        // Create a BackendIdentifier object for the sandbox
        const backendId: BackendIdentifier = {
          namespace: this.namespace, // Use the provided namespace
          name: this.backendName,
          type: 'sandbox',
        };
        const data = await this.backendClient.getBackendMetadata(backendId);
        printer.log('Successfully fetched backend metadata', LogLevel.DEBUG);

        // Get the AWS region from the CloudFormation client
        const cfnClient = new CloudFormationClient();
        const regionValue = cfnClient.config.region;

        // Handle different types of region values
        let region = null;

        try {
          if (typeof regionValue === 'function') {
            // If it's an async function, we need to await it
            if (regionValue.constructor.name === 'AsyncFunction') {
              region = await regionValue();
            } else {
              region = regionValue();
            }
          } else if (regionValue) {
            region = String(regionValue);
          }

          // Final check to ensure region is a string
          if (region && typeof region !== 'string') {
            region = String(region);
          }
        } catch (error) {
          printer.log('Error processing region: ' + error, LogLevel.ERROR);
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
            const metadata =
              'metadata' in resource &&
              typeof resource.metadata === 'object' &&
              resource.metadata !== null &&
              'constructPath' in resource.metadata
                ? {
                    constructPath: resource.metadata.constructPath as string,
                  }
                : undefined;

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
        printer.log(
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
      printer.log(
        `Error checking sandbox status: ${String(error)}`,
        LogLevel.ERROR,
      );
      throw error;
    }
  }
}
