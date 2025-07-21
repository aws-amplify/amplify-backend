import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SocketEvents } from './socket_handlers.js';
import { SandboxStatus } from '@aws-amplify/sandbox';

/**
 * Service for handling socket events related to resources
 */
export class SocketHandlerResources {
  private lastEventTimestamp: Record<string, Date> = {};

  /**
   * Creates a new SocketHandlerResources
   */
  constructor(
    private io: Server,
    private storageManager: LocalStorageManager,
    private backendId: BackendIdentifier,
    private getSandboxState: () => Promise<SandboxStatus>,
    private lambdaClient: LambdaClient,
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {}

  /**
   * Handles the testLambdaFunction event
   */
  public async handleTestLambdaFunction(
    socket: Socket,
    data: SocketEvents['testLambdaFunction'],
  ): Promise<void> {
    if (!data?.resourceId || !data?.functionName) {
      socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
        resourceId: data?.resourceId || 'unknown',
        error: 'Invalid function information provided',
      });
      return;
    }

    try {
      const { resourceId, functionName, input } = data;

      // Parse the input as JSON
      let payload: Record<string, unknown>;
      try {
        payload = input ? JSON.parse(input) : {};
      } catch (error) {
        socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
          resourceId,
          error: `Invalid JSON input: ${String(error)}`,
        });
        return;
      }

      // Invoke the Lambda function
      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify(payload),
        LogType: 'Tail', // Include the execution log
      });

      const response = await this.lambdaClient.send(command);

      // Parse the response payload
      let result = '';
      if (response.Payload) {
        const responseText = Buffer.from(response.Payload).toString('utf-8');
        result = responseText;
      }

      // Send the result to the client
      socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
        resourceId,
        result,
      });
    } catch (error) {
      this.printer.log(
        `Error testing Lambda function ${data.functionName}: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
        resourceId: data.resourceId,
        error: String(error),
      });
    }
  }

  /**
   * Handles the getSavedResources event
   */
  public handleGetSavedResources(socket: Socket): void {
    const resources = this.storageManager.loadResources();
    socket.emit(SOCKET_EVENTS.SAVED_RESOURCES, resources || []);
  }

  /**
   * Handles the getCustomFriendlyNames event
   */
  public handleGetCustomFriendlyNames(socket: Socket): void {
    // Get custom friendly names from storage
    const friendlyNames = this.storageManager.loadCustomFriendlyNames();
    socket.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, friendlyNames);
  }

  /**
   * Handles the updateCustomFriendlyName event
   */
  public handleUpdateCustomFriendlyName(
    data: SocketEvents['updateCustomFriendlyName'],
  ): void {
    if (!data || !data.resourceId || !data.friendlyName) {
      return;
    }

    // Store the custom friendly name
    this.storageManager.updateCustomFriendlyName(
      data.resourceId,
      data.friendlyName,
    );

    // Emit event to all clients
    this.io.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED, {
      resourceId: data.resourceId,
      friendlyName: data.friendlyName,
    });

    this.printer.log(
      `Custom friendly name updated for ${data.resourceId}: ${data.friendlyName}`,
      LogLevel.INFO,
    );
  }

  /**
   * Handles the removeCustomFriendlyName event
   */
  public handleRemoveCustomFriendlyName(
    data: SocketEvents['removeCustomFriendlyName'],
  ): void {
    if (!data || !data.resourceId) {
      return;
    }

    this.storageManager.removeCustomFriendlyName(data.resourceId);

    this.io.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED, {
      resourceId: data.resourceId,
    });

    this.printer.log(
      `Custom friendly name removed for ${data.resourceId}`,
      LogLevel.INFO,
    );
  }
}
