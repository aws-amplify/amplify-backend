import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { DeployedBackendClient } from '@aws-amplify/deployed-backend-client';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { RegionFetcher } from '@aws-amplify/platform-core';
import { createFriendlyName } from '../logging/cloudformation_format.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import {
  ResourceWithFriendlyName,
  getAwsConsoleUrl,
  isCompleteResource,
} from '../resource_console_functions.js';
import { getLogGroupName } from '../logging/log_group_extractor.js';
import { SandboxStatus } from '@aws-amplify/sandbox';

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
    private storageManager: LocalStorageManager,
    private readonly backendName: string,
    private getSandboxState: () => Promise<SandboxStatus>,
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
      // Get the current sandbox state first
      const sandboxState = await this.getSandboxState();

      // Try to load saved resources first
      const savedResources = this.storageManager.loadResources();
      if (savedResources) {
        this.printer.log(
          'Found saved resources, returning them',
          LogLevel.DEBUG,
        );
        return {
          ...savedResources,
          status: sandboxState,
        } as DeployedBackendResources;
      }

      // Only proceed with fetching actual resources if sandbox is running or stopped
      if (sandboxState !== 'running' && sandboxState !== 'stopped') {
        // For non-running states, return appropriate status
        return {
          name: this.backendName,
          status: sandboxState,
          resources: [],
          region: null,
          message:
            sandboxState === 'nonexistent'
              ? 'No sandbox exists. Please create a sandbox first.'
              : `Sandbox is ${sandboxState}. Resources can't be fetched at this time.`,
        };
      }

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

            // Add log group name (if this resource type supports logs)
            const logGroupName = getLogGroupName(
              resourceType,
              resource.physicalResourceId,
            );
            resourceWithFriendlyName.logGroupName = logGroupName;

            return resourceWithFriendlyName;
          });

        // Add region and resources with friendly names to the data
        const enhancedData = {
          ...data,
          region,
          resources: resourcesWithFriendlyNames,
        };

        this.storageManager.saveResources(enhancedData);

        return enhancedData;
      } catch (error) {
        const errorMessage = String(error);
        this.printer.log(
          `Error getting backend resources: ${errorMessage}`,
          LogLevel.ERROR,
        );
        //NOTE: we should never actually reach here if the sandbox
        // does a good job of handling its own state(because we only try if the sandbox is running or stopped)
        // but if we do, we should handle the error gracefully
        // and return an empty resources array with a message
        // This could also help people with potential debugging issues
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
