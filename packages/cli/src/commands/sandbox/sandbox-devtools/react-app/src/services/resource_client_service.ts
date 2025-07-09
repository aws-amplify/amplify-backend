import { SocketClientService } from './socket_client_service';

/**
 * Type for a resource with friendly name
 */
export interface ResourceWithFriendlyName {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
  consoleUrl?: string | null;
}

/**
 * Type for backend resources data
 */
export interface BackendResourcesData {
  name: string;
  status: string;
  resources: ResourceWithFriendlyName[];
  region: string | null;
  message?: string;
}

/**
 * Service for handling resource-related socket communication
 */
export class ResourceClientService extends SocketClientService {
  /**
   * Requests custom friendly names from the server
   */
  public getCustomFriendlyNames(): void {
    this.emit('getCustomFriendlyNames');
  }

  /**
   * Requests saved resources from the server
   */
  public getSavedResources(): void {
    this.emit('getSavedResources');
  }

  /**
   * Requests deployed backend resources from the server
   */
  public getDeployedBackendResources(): void {
    this.emit('getDeployedBackendResources');
  }

  /**
   * Updates a custom friendly name for a resource
   * @param resourceId The resource ID
   * @param friendlyName The friendly name
   */
  public updateCustomFriendlyName(
    resourceId: string,
    friendlyName: string,
  ): void {
    this.emit('updateCustomFriendlyName', { resourceId, friendlyName });
  }

  /**
   * Removes a custom friendly name for a resource
   * @param resourceId The resource ID
   */
  public removeCustomFriendlyName(resourceId: string): void {
    this.emit('removeCustomFriendlyName', { resourceId });
  }

  /**
   * Registers a handler for saved resources events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onSavedResources(
    handler: (data: BackendResourcesData) => void,
  ): () => void {
    return this.on('savedResources', handler);
  }

  /**
   * Registers a handler for deployed backend resources events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onDeployedBackendResources(
    handler: (data: BackendResourcesData) => void,
  ): () => void {
    return this.on('deployedBackendResources', handler);
  }

  /**
   * Registers a handler for custom friendly names events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onCustomFriendlyNames(
    handler: (data: Record<string, string>) => void,
  ): () => void {
    return this.on('customFriendlyNames', handler);
  }

  /**
   * Registers a handler for custom friendly name updated events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onCustomFriendlyNameUpdated(
    handler: (data: { resourceId: string; friendlyName: string }) => void,
  ): () => void {
    return this.on('customFriendlyNameUpdated', handler);
  }

  /**
   * Registers a handler for custom friendly name removed events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onCustomFriendlyNameRemoved(
    handler: (data: { resourceId: string }) => void,
  ): () => void {
    return this.on('customFriendlyNameRemoved', handler);
  }

  /**
   * Registers a handler for error events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onError(handler: (data: { message: string }) => void): () => void {
    return this.on('error', handler);
  }
}
