import { SocketClientService } from './socket_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { ResourceWithFriendlyName } from '../../../resource_console_functions';

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
    this.emit(SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES);
  }

  /**
   * Requests saved resources from the server
   */
  public getSavedResources(): void {
    this.emit(SOCKET_EVENTS.GET_SAVED_RESOURCES);
  }

  /**
   * Requests deployed backend resources from the server
   */
  public getDeployedBackendResources(): void {
    this.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);
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
    this.emit(SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME, {
      resourceId,
      friendlyName,
    });
  }

  /**
   * Removes a custom friendly name for a resource
   * @param resourceId The resource ID
   */
  public removeCustomFriendlyName(resourceId: string): void {
    this.emit(SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME, { resourceId });
  }

  /**
   * Registers a handler for saved resources events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onSavedResources(handler: (data: BackendResourcesData) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.SAVED_RESOURCES, handler);
  }

  /**
   * Registers a handler for deployed backend resources events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onDeployedBackendResources(
    handler: (data: BackendResourcesData) => void,
  ): { unsubscribe: () => void } {
    return this.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, handler);
  }

  /**
   * Registers a handler for custom friendly names events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onCustomFriendlyNames(
    handler: (data: Record<string, string>) => void,
  ): { unsubscribe: () => void } {
    return this.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, handler);
  }

  /**
   * Registers a handler for custom friendly name updated events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onCustomFriendlyNameUpdated(
    handler: (data: { resourceId: string; friendlyName: string }) => void,
  ): { unsubscribe: () => void } {
    return this.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED, handler);
  }

  /**
   * Registers a handler for custom friendly name removed events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onCustomFriendlyNameRemoved(
    handler: (data: { resourceId: string }) => void,
  ): { unsubscribe: () => void } {
    return this.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED, handler);
  }

  /**
   * Registers a handler for error events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onError(handler: (data: { message: string }) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.ERROR, handler);
  }
}
