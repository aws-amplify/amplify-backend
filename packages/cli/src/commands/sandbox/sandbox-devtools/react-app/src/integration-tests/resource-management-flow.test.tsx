import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocketClientProvider } from '../contexts/socket_client_context';
import App from '../App';
import { TestDevToolsServer } from '../test/test-devtools-server';
import { LogLevel } from '@aws-amplify/cli-core';

describe('Resource Management and Error Recovery Flow', () => {
  let devToolsServer: TestDevToolsServer;
  let serverUrl: string;

  // Set up the test server before each test
  beforeEach(async () => {
    // Start the DevTools server
    devToolsServer = new TestDevToolsServer();

    // Clear any stored data to prevent test contamination
    const storageManager = devToolsServer.getStorageManager();
    storageManager.clearAll();

    serverUrl = await devToolsServer.start();

    // Mock window.location.origin to point to our test server
    Object.defineProperty(window, 'location', {
      value: { origin: serverUrl },
      writable: true,
    });

    vi.clearAllMocks();
  });

  // Clean up after each test
  afterEach(async () => {
    await devToolsServer.stop();
    vi.resetAllMocks();
  });

  it('tests complete user journey with cross-component interaction and error recovery', async () => {
    // Use default test timeout
    const user = userEvent.setup();

    // Render the app with real socket provider
    render(
      <SocketClientProvider>
        <App />
      </SocketClientProvider>,
    );

    // 1. Wait for initial connection and verify header shows connected status
    await waitFor(() => {
      expect(
        screen.getByText(/DevTools connected to Amplify Sandbox/i),
      ).toBeInTheDocument();
    });

    // 2. Verify initial sandbox status is displayed in the header
    devToolsServer.changeSandboxState('nonexistent');
    await waitFor(() => {
      const headerElement = screen.getByTestId('header-component');
      expect(
        within(headerElement).getByText(/No Sandbox/i),
      ).toBeInTheDocument();
    });

    // 3. Start the sandbox and interact with options modal
    // This tests cross-component interaction as status should update in multiple places
    const startButton = screen.getByRole('button', { name: /Start Sandbox/i });
    await user.click(startButton);

    // Verify a modal appears
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Find and click the Start button in the modal footer
    const modalElement = screen.getByTestId('modal');
    const startSandboxButton = within(modalElement).getByRole('button', {
      name: /Start/i,
    });
    await user.click(startSandboxButton);

    // Now the sandbox should be in deploying state
    devToolsServer.changeSandboxState('deploying');

    // Verify deployment progress component expands automatically
    await waitFor(() => {
      expect(
        screen.getByText(/Waiting for deployment events/i),
      ).toBeInTheDocument();
    });

    // Emit deployment events
    devToolsServer.emitCloudFormationEvent({
      message: 'Creating Lambda function',
      timestamp: new Date().toISOString(),
      resourceStatus: {
        resourceType: 'AWS::Lambda::Function',
        resourceName: 'TestFunction',
        status: 'CREATE_IN_PROGRESS',
        timestamp: new Date().toISOString(),
        key: 'lambda-1',
        eventId: 'event-1',
      },
    });

    // Verify deployment events appear in deployment progress component
    await waitFor(() => {
      expect(screen.getByText(/AWS::Lambda::Function/i)).toBeInTheDocument();
      expect(screen.getByText(/TestFunction/i)).toBeInTheDocument();
    });

    // 4. Test log events and their effect on multiple components
    devToolsServer.emitLog(LogLevel.INFO, 'Lambda function created');

    // Verify log appears in console viewer
    await waitFor(() => {
      expect(screen.getByText(/Lambda function created/i)).toBeInTheDocument();
    });

    // 5. Complete deployment and verify UI state changes across components
    devToolsServer.changeSandboxState('running');
    devToolsServer.emitCloudFormationEvent({
      message: 'Lambda function created',
      timestamp: new Date().toISOString(),
      resourceStatus: {
        resourceType: 'AWS::Lambda::Function',
        resourceName: 'TestFunction',
        status: 'CREATE_COMPLETE',
        timestamp: new Date().toISOString(),
        key: 'lambda-1',
        eventId: 'event-2',
      },
    });

    // Verify status changes in header
    await waitFor(() => {
      const headerElement = screen.getByTestId('header-component');
      expect(within(headerElement).getByText(/running/i)).toBeInTheDocument();
    });

    // 6. Simulate resources appearing in resources panel with complete resource objects
    const mockResources = [
      {
        physicalResourceId: 'lambda-1',
        logicalResourceId: 'TestFunction',
        resourceType: 'AWS::Lambda::Function',
        resourceStatus: 'CREATE_COMPLETE',
        friendlyName: 'TestFunction',
        consoleUrl:
          'https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/lambda-1',
        logGroupName: '/aws/lambda/test-function',
      },
      {
        physicalResourceId: 'api-1',
        logicalResourceId: 'TestAPI',
        resourceType: 'AWS::ApiGateway::RestApi',
        resourceStatus: 'CREATE_COMPLETE',
        friendlyName: 'TestAPI',
        consoleUrl:
          'https://console.aws.amazon.com/apigateway/home?region=us-east-1',
        logGroupName: null,
      },
    ];

    // Then use the server method to also emit deployed resources
    devToolsServer.setResources(mockResources);

    // Navigate to resources tab
    const resourcesTab = screen.getByRole('tab', { name: /Resources/i });
    await user.click(resourcesTab);

    // Verify resources are displayed with increased timeout
    await waitFor(() => {
      // Check for physical IDs which are unique
      expect(screen.getByText('lambda-1')).toBeInTheDocument();
      expect(screen.getByText('api-1')).toBeInTheDocument();
    });

    // 7. Test resource view's error handling capabilities

    // Emit an error log to test error handling
    devToolsServer.emitLog(
      LogLevel.ERROR,
      'Error executing function: Memory limit exceeded',
    );

    // First verify the error shows up in the console logs
    // Switch to logs tab
    const logsTab = screen.getByRole('tab', { name: /Console Logs/i });
    await user.click(logsTab);

    // Verify error appears in console logs
    await waitFor(() => {
      expect(screen.getByText(/Memory limit exceeded/i)).toBeInTheDocument();
    });

    // 8. Test shutdown sequence

    // Test delete sandbox modal
    // The delete button should be available and show a confirmation modal
    const deleteButton = screen.getByRole('button', {
      name: /Delete Sandbox/i,
    });
    await user.click(deleteButton);

    // Verify delete confirmation modal appears
    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to delete the sandbox\?/i),
      ).toBeInTheDocument();
    });

    // Confirm delete - use within to get the button inside the modal
    const modalDialog = screen.getByTestId('modal');
    const confirmButton = within(modalDialog).getByRole('button', {
      name: /^Delete$/i,
    });
    await user.click(confirmButton);

    // Complete deleting process
    devToolsServer.changeSandboxState('nonexistent');

    // Verify nonexistent state in header
    await waitFor(() => {
      const headerElement = screen.getByTestId('header-component');
      expect(
        within(headerElement).getByText(/No Sandbox/i),
      ).toBeInTheDocument();
    });
  });
});
