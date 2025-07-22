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
   * Event to get log settings
   */
  GET_LOG_SETTINGS: 'getLogSettings',

  /**
   * Event to save log settings
   */
  SAVE_LOG_SETTINGS: 'saveLogSettings',

  /**
   * Event received when log settings are sent from the server
   */
  LOG_SETTINGS: 'logSettings',

  /**
   * Event to toggle resource logging
   */
  TOGGLE_RESOURCE_LOGGING: 'toggleResourceLogging',

  /**
   * Event to view logs for a specific resource
   */
  VIEW_RESOURCE_LOGS: 'viewResourceLogs',

  /**
   * Event to get saved logs for a resource
   */
  GET_SAVED_RESOURCE_LOGS: 'getSavedResourceLogs',

  /**
   * Event to get active log streams
   */
  GET_ACTIVE_LOG_STREAMS: 'getActiveLogStreams',

  /**
   * Event received when active log streams are sent from the server.
   * Contains the current list of resource IDs that have active logging.
   * Used for: UI state synchronization, showing which resources are being logged.
   * Triggered by: Client requests, bulk state updates after logging changes.
   */
  ACTIVE_LOG_STREAMS: 'activeLogStreams',

  /**
   * Event received when log stream status changes for a specific resource.
   * Contains status transitions like 'starting', 'active', 'stopped', 'already-active'.
   * Used for: Real-time user feedback during logging state transitions.
   * Triggered by: Individual logging toggle actions, immediate status updates.
   *
   * Note: This is different from ACTIVE_LOG_STREAMS which provides the current
   * list of all active resources, while this provides transition feedback for
   * individual resources.
   */
  LOG_STREAM_STATUS: 'logStreamStatus',

  /**
   * Event received when resource logs are sent from the server
   */
  RESOURCE_LOGS: 'resourceLogs',

  /**
   * Event received when saved resource logs are sent from the server
   */
  SAVED_RESOURCE_LOGS: 'savedResourceLogs',

  /**
   * Event received when a log stream error occurs
   */
  LOG_STREAM_ERROR: 'logStreamError',

  /**
   * Event to test a Lambda function
   */
  TEST_LAMBDA_FUNCTION: 'testLambdaFunction',

  /**
   * Event received when Lambda test results are sent from the server
   */
  LAMBDA_TEST_RESULT: 'lambdaTestResult',

  /**
   * Event received when a log message is sent from the server
   */
  LOG: 'log',

  /**
   * Event received when an error occurs
   */
  ERROR: 'error',

  /**
   * Event to save console logs
   */
  SAVE_CONSOLE_LOGS: 'saveConsoleLogs',

  /**
   * Event to load console logs
   */
  LOAD_CONSOLE_LOGS: 'loadConsoleLogs',

  /**
   * Event received when saved console logs are sent from the server
   */
  SAVED_CONSOLE_LOGS: 'savedConsoleLogs',

  /**
   * Event which triggers UI to show a deployment error
   * Contains error details like name, message, resolution, and timestamp.
   */
  DEPLOYMENT_ERROR: 'deploymentError',
} as const;
