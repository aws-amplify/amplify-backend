import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SocketClientProvider } from '../contexts/socket_client_context';
import App from '../App';
import { TestDevToolsServer } from '../test/test-devtools-server';
import { tmpdir } from 'os';
import { mkdtempSync, rmdirSync } from 'fs';
import { join } from 'path';
import { LogLevel } from '@aws-amplify/cli-core';

describe('Console Logs Integration', () => {
  let devToolsServer: TestDevToolsServer;
  let serverUrl: string;
  let tempDir: string;

  // Set up the test server before each test
  beforeEach(async () => {
    // Create a temporary directory for test storage
    tempDir = mkdtempSync(join(tmpdir(), 'amplify-test-'));

    // Start the DevTools server
    devToolsServer = new TestDevToolsServer();

    // Clear any stored console logs to prevent test contamination
    const storageManager = devToolsServer.getStorageManager();
    storageManager.clearAll(); // Clear all stored data before each test

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
    // Stop the server
    await devToolsServer.stop();

    // Clean up temporary directory
    try {
      rmdirSync(tempDir, { recursive: true });
    } catch (error) {
      console.error(`Error cleaning up test storage: ${error}`);
    }

    vi.resetAllMocks();
  });

  it('displays console logs from server events', async () => {
    // Render the app with real socket provider
    render(
      <SocketClientProvider>
        <App />
      </SocketClientProvider>,
    );

    // Wait for connection to be established
    await waitFor(() => {
      expect(
        screen.getByText(/DevTools connected to Amplify Sandbox/i),
      ).toBeInTheDocument();
    });

    // Emit logs from the server
    devToolsServer.emitLog(LogLevel.INFO, 'Test log message');
    devToolsServer.emitLog(LogLevel.WARN, 'Warning message');
    devToolsServer.emitLog(LogLevel.ERROR, 'Error message');

    // Verify logs are displayed
    await waitFor(() => {
      expect(screen.getByText(/Test log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Warning message/i)).toBeInTheDocument();
      expect(screen.getByText(/Error message/i)).toBeInTheDocument();
    });
  });

  it('handles sandbox state changes and logs them', async () => {
    // Render the app with real socket provider
    render(
      <SocketClientProvider>
        <App />
      </SocketClientProvider>,
    );

    // Wait for connection to be established
    await waitFor(() => {
      expect(
        screen.getByText(/DevTools connected to Amplify Sandbox/i),
      ).toBeInTheDocument();
    });

    // Change sandbox state to running
    devToolsServer.changeSandboxState('running');

    // Verify status change is logged
    await waitFor(() => {
      expect(
        screen.getByText(/Sandbox status changed to: running/i),
      ).toBeInTheDocument();
    });

    // Change to deploying status
    devToolsServer.changeSandboxState('deploying');

    // Verify deploying status is logged
    await waitFor(() => {
      expect(
        screen.getByText(/Sandbox status changed to: deploying/i),
      ).toBeInTheDocument();
    });

    // Change back to running
    devToolsServer.changeSandboxState('running');

    // Verify running status is logged again
    await waitFor(() => {
      const runningLogs = screen.getAllByText(
        /Sandbox status changed to: running/i,
      );
      expect(runningLogs.length).toBeGreaterThan(1);
    });
  });

  it('tests log filtering by level', async () => {
    // Render the app
    render(
      <SocketClientProvider>
        <App />
      </SocketClientProvider>,
    );

    // Wait for connection
    await waitFor(() => {
      expect(
        screen.getByText(/DevTools connected to Amplify Sandbox/i),
      ).toBeInTheDocument();
    });

    // Emit logs with different levels
    devToolsServer.emitLog(LogLevel.INFO, 'Info log message');
    devToolsServer.emitLog(LogLevel.WARN, 'Warning log message');
    devToolsServer.emitLog(LogLevel.ERROR, 'Error log message');
    devToolsServer.emitLog(LogLevel.INFO, 'Success log message');

    // Verify all logs are initially displayed
    await waitFor(() => {
      expect(screen.getByText(/Info log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Warning log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Error log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Success log message/i)).toBeInTheDocument();
    });

    // Find and click the filter dropdown
    const filterDropdown = screen.getByLabelText('Filter by log level');
    fireEvent.click(filterDropdown);

    // Select only ERROR level
    const errorOption = await screen.findByTestId('filter-option-ERROR');
    fireEvent.click(errorOption);

    // Close the dropdown
    fireEvent.click(document.body);

    // Verify only ERROR logs are displayed
    await waitFor(() => {
      expect(screen.getByText(/Error log message/i)).toBeInTheDocument();
      expect(screen.queryByText(/Info log message/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Warning log message/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Success log message/i),
      ).not.toBeInTheDocument();
    });
  });

  it('tests search functionality', async () => {
    // Render the app
    render(
      <SocketClientProvider>
        <App />
      </SocketClientProvider>,
    );

    // Wait for connection
    await waitFor(() => {
      expect(
        screen.getByText(/DevTools connected to Amplify Sandbox/i),
      ).toBeInTheDocument();
    });

    // Emit logs with different content
    devToolsServer.emitLog(LogLevel.INFO, 'Apple log message');
    devToolsServer.emitLog(LogLevel.INFO, 'Banana log message');
    devToolsServer.emitLog(LogLevel.INFO, 'Cherry log message');
    devToolsServer.emitLog(LogLevel.INFO, 'Apple and Cherry message');

    // Verify all logs are initially displayed
    await waitFor(() => {
      expect(screen.getByText(/Apple log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Banana log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Cherry log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Apple and Cherry message/i)).toBeInTheDocument();
    });

    // Find the search input
    const searchInput = screen.getByPlaceholderText('Search in logs...');

    // Search for 'Apple'
    fireEvent.change(searchInput, { target: { value: 'Apple' } });

    // Verify only Apple logs are displayed
    await waitFor(() => {
      expect(screen.getByText(/Apple log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Apple and Cherry message/i)).toBeInTheDocument();
      expect(screen.queryByText(/Banana log message/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cherry log message/i)).not.toBeInTheDocument();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Verify all logs are displayed again
    await waitFor(() => {
      expect(screen.getByText(/Apple log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Banana log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Cherry log message/i)).toBeInTheDocument();
      expect(screen.getByText(/Apple and Cherry message/i)).toBeInTheDocument();
    });
  });

  it('tests sandbox lifecycle operations', async () => {
    // Render the app
    render(
      <SocketClientProvider>
        <App />
      </SocketClientProvider>,
    );

    // Wait for connection
    await waitFor(() => {
      expect(
        screen.getByText(/DevTools connected to Amplify Sandbox/i),
      ).toBeInTheDocument();
    });

    // Start the sandbox
    devToolsServer.startSandbox();

    // Verify deployment started is logged
    await waitFor(() => {
      expect(screen.getByText(/Deployment started/i)).toBeInTheDocument();
    });

    // Wait for deployment to complete
    await waitFor(
      () => {
        expect(
          screen.getByText(/Deployment completed successfully/i),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Stop the sandbox
    devToolsServer.stopSandbox();

    // Verify stop is logged
    await waitFor(() => {
      expect(
        screen.getByText(/Sandbox stopped successfully/i),
      ).toBeInTheDocument();
    });

    // Delete the sandbox
    devToolsServer.deleteSandbox();

    // Verify deletion started is logged
    await waitFor(() => {
      expect(screen.getByText(/Deletion started/i)).toBeInTheDocument();
    });

    // Wait for deletion to complete
    await waitFor(
      () => {
        expect(
          screen.getByText(/Sandbox deleted successfully/i),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
