/**
 * Socket event constants for communication between client and server
 */
export const SOCKET_EVENTS = {
  // Resource-related events
  /**
   * Event to request custom friendly names from the server
   */
  GET_CUSTOM_FRIENDLY_NAMES: 'getCustomFriendlyNames',

  /**
   * Event received when custom friendly names are sent from the server
   */
  CUSTOM_FRIENDLY_NAMES: 'customFriendlyNames',

  /**
   * Event to request saved resources from the server
   */
  GET_SAVED_RESOURCES: 'getSavedResources',

  /**
   * Event received when saved resources are sent from the server
   */
  SAVED_RESOURCES: 'savedResources',

  /**
   * Event to request deployed backend resources from the server
   */
  GET_DEPLOYED_BACKEND_RESOURCES: 'getDeployedBackendResources',

  /**
   * Event received when deployed backend resources are sent from the server
   */
  DEPLOYED_BACKEND_RESOURCES: 'deployedBackendResources',

  /**
   * Event to update a custom friendly name for a resource
   */
  UPDATE_CUSTOM_FRIENDLY_NAME: 'updateCustomFriendlyName',

  /**
   * Event received when a custom friendly name is updated
   */
  CUSTOM_FRIENDLY_NAME_UPDATED: 'customFriendlyNameUpdated',

  /**
   * Event to remove a custom friendly name for a resource
   */
  REMOVE_CUSTOM_FRIENDLY_NAME: 'removeCustomFriendlyName',

  /**
   * Event received when a custom friendly name is removed
   */
  CUSTOM_FRIENDLY_NAME_REMOVED: 'customFriendlyNameRemoved',

  // Sandbox-related events
  /**
   * Event to request the current sandbox status
   */
  GET_SANDBOX_STATUS: 'getSandboxStatus',

  /**
   * Event received when sandbox status is sent from the server
   */
  SANDBOX_STATUS: 'sandboxStatus',

  /**
   * Event to start the sandbox with options
   */
  START_SANDBOX_WITH_OPTIONS: 'startSandboxWithOptions',

  /**
   * Event to stop the sandbox
   */
  STOP_SANDBOX: 'stopSandbox',

  /**
   * Event to delete the sandbox
   */
  DELETE_SANDBOX: 'deleteSandbox',

  /**
   * Event to stop the DevTools process
   */
  STOP_DEV_TOOLS: 'stopDevTools',

  /**
   * Event to get saved deployment progress
   */
  GET_SAVED_DEPLOYMENT_PROGRESS: 'getSavedDeploymentProgress',

  /**
   * Event to get log settings
   */
  GET_LOG_SETTINGS: 'getLogSettings',

  /**
   * Event received when deployment is in progress
   */
  DEPLOYMENT_IN_PROGRESS: 'deploymentInProgress',

  /**
   * Event received when a log message is sent from the server
   */
  LOG: 'log',

  /**
   * Event received when an error occurs
   */
  ERROR: 'error',
} as const;
