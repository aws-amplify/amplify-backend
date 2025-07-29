import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import App from './App';
import * as socketClientContext from './contexts/socket_client_context';
import { SandboxStatus } from '@aws-amplify/sandbox';
import { 
  ConsoleLogEntry, 
  DevToolsSandboxOptions,
  LogEntry,
  SandboxStatusData
} from '../../shared/socket_types';
import type { LogSettings } from './components/LogSettingsModal';
import type { SandboxClientService } from './services/sandbox_client_service';
import { DeploymentClientService } from './services/deployment_client_service';

// Mock the socket context
vi.mock('./contexts/socket_client_context', async () => {
  const actual = await vi.importActual('./contexts/socket_client_context');
  return {
    ...actual,
    // Mock the provider to pass through children for simpler testing
    SocketClientProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    // Mock the hooks to return controllable services
    useSandboxClientService: vi.fn(),
    useDeploymentClientService: vi.fn(),
    useLoggingClientService: vi.fn(),
    useResourceClientService: vi.fn(),
  };
});

// Mock the cloudscape components to simplify testing
vi.mock('@cloudscape-design/components', () => ({
  AppLayout: ({ content }: { content: React.ReactNode }) => (
    <div data-testid="app-layout">{content}</div>
  ),
  Tabs: ({
    tabs,
    activeTabId,
    onChange,
  }: {
    tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
    activeTabId: string;
    onChange: (event: { detail: { activeTabId: string } }) => void;
  }) => (
    <div data-testid="tabs-component">
      <div data-testid="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            aria-selected={tab.id === activeTabId}
            onClick={() => onChange({ detail: { activeTabId: tab.id } })}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div data-testid="tabs-content">
        {tabs.find((tab) => tab.id === activeTabId)?.content}
      </div>
    </div>
  ),
  ContentLayout: ({
    header,
    children,
  }: {
    header: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="content-layout">
      <div data-testid="content-layout-header">{header}</div>
      <div data-testid="content-layout-children">{children}</div>
    </div>
  ),
  SpaceBetween: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="space-between">{children}</div>
  ),
  Alert: ({
    type,
    header,
    children,
    dismissible,
    onDismiss,
  }: {
    type: string;
    header: string;
    children?: React.ReactNode;
    dismissible?: boolean;
    onDismiss?: () => void;
  }) => (
    <div data-testid={`alert-${type}`} role="alert">
      <div data-testid="alert-header">{header}</div>
      <div data-testid="alert-content">{children}</div>
      {dismissible && (
        <button
          data-testid="alert-dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      )}
    </div>
  ),
}));

// Mock child components to simplify testing
vi.mock('./components/ConsoleViewer', () => ({
  default: vi.fn(({ logs }: { logs: ConsoleLogEntry[] }) => (
    <div data-testid="console-viewer">
      Console Viewer
      <ul>
        {logs.map((log) => (
          <li key={log.id} data-testid={`log-${log.id}`}>
            [{log.level}] {log.message}
          </li>
        ))}
      </ul>
    </div>
  )),
}));

vi.mock('./components/Header', () => ({
  default: vi.fn(
    (props: {
      connected: boolean;
      sandboxStatus: SandboxStatus;
      sandboxIdentifier?: string;
      onStartSandbox: () => void;
      onStopSandbox: () => void;
      onDeleteSandbox: () => void;
      onStopDevTools: () => void;
      onOpenSettings: () => void;
      isStartingLoading: boolean;
      isStoppingLoading: boolean;
      isDeletingLoading: boolean;
    }) => (
      <div data-testid="header-component">
        <div>Connected: {props.connected.toString()}</div>
        <div>Status: {props.sandboxStatus}</div>
        {props.sandboxIdentifier && <div>ID: {props.sandboxIdentifier}</div>}
        <button
          onClick={props.onStartSandbox}
          disabled={props.isStartingLoading}
        >
          Start Sandbox
        </button>
        <button
          onClick={props.onStopSandbox}
          disabled={props.isStoppingLoading}
        >
          Stop Sandbox
        </button>
        <button
          onClick={props.onDeleteSandbox}
          disabled={props.isDeletingLoading}
        >
          Delete Sandbox
        </button>
        <button onClick={props.onStopDevTools}>Stop DevTools</button>
        <button onClick={props.onOpenSettings}>Open Settings</button>
      </div>
    ),
  ),
}));

vi.mock('./components/ResourceConsole', () => ({
  default: vi.fn(({ sandboxStatus }: { sandboxStatus: SandboxStatus }) => (
    <div data-testid="resource-console">
      Resource Console (Status: {sandboxStatus})
    </div>
  )),
}));

vi.mock('./components/DeploymentProgress', () => ({
  default: vi.fn(
    ({
      visible,
      status,
    }: {
      deploymentClientService: DeploymentClientService;
      visible: boolean;
      status: SandboxStatus;
    }) => (
      <div
        data-testid="deployment-progress"
        style={{ display: visible ? 'block' : 'none' }}
      >
        Deployment Progress (Status: {status})
      </div>
    ),
  ),
}));

vi.mock('./components/SandboxOptionsModal', () => ({
  default: vi.fn(
    ({
      onConfirm,
      visible,
      onDismiss,
    }: {
      onConfirm: (options: DevToolsSandboxOptions) => void;
      visible: boolean;
      onDismiss: () => void;
    }) => (
      <div
        data-testid="sandbox-options-modal"
        style={{ display: visible ? 'block' : 'none' }}
      >
        <button
          data-testid="sandbox-options-start"
          onClick={() => onConfirm({})}
        >
          Start
        </button>
        <button data-testid="sandbox-options-cancel" onClick={onDismiss}>
          Cancel
        </button>
      </div>
    ),
  ),
}));

vi.mock('./components/LogSettingsModal', () => ({
  default: vi.fn(
    ({
      onSave,
      visible,
      onDismiss,
      initialSettings,
      currentSizeMB,
    }: {
      onSave: (settings: LogSettings) => void;
      visible: boolean;
      onDismiss: () => void;
      initialSettings: LogSettings;
      currentSizeMB?: number;
    }) => (
      <div
        data-testid="log-settings-modal"
        style={{ display: visible ? 'block' : 'none' }}
      >
        <div>Current Size: {currentSizeMB || 'N/A'} MB</div>
        <div>Max Size: {initialSettings.maxLogSizeMB} MB</div>
        <button
          data-testid="log-settings-save"
          onClick={() => onSave({ maxLogSizeMB: 100 })}
        >
          Save
        </button>
        <button data-testid="log-settings-cancel" onClick={onDismiss}>
          Cancel
        </button>
      </div>
    ),
  ),
}));

describe('App Component', () => {
  // Create mock services
  const createMockSandboxService = () => {
    const subscribers = {
      connect: [] as Array<() => void>,
      disconnect: [] as Array<(reason: string) => void>,
      log: [] as Array<(data: LogEntry) => void>,
      sandboxStatus: [] as Array<(data: SandboxStatusData) => void>,
      logSettings: [] as Array<(data: LogSettings) => void>,
      savedConsoleLogs: [] as Array<(data: ConsoleLogEntry[]) => void>,
      connectError: [] as Array<(error: Error) => void>,
      connectTimeout: [] as Array<() => void>,
      reconnect: [] as Array<(attemptNumber: number) => void>,
      reconnectAttempt: [] as Array<(attemptNumber: number) => void>,
      reconnectError: [] as Array<(error: Error) => void>,
      reconnectFailed: [] as Array<() => void>,
    };

    return {
      // Methods
      startSandboxWithOptions: vi.fn(),
      stopSandbox: vi.fn(),
      deleteSandbox: vi.fn(),
      stopDevTools: vi.fn(),
      getSandboxStatus: vi.fn(),
      getLogSettings: vi.fn(),
      saveLogSettings: vi.fn(),
      loadConsoleLogs: vi.fn(),
      saveConsoleLogs: vi.fn(),
      disconnect: vi.fn(),
      startPingInterval: vi.fn(() => ({
        unsubscribe: vi.fn(),
      })),

      // Event handlers
      onConnect: vi.fn((handler) => {
        subscribers.connect.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.connect.indexOf(handler);
            if (index !== -1) subscribers.connect.splice(index, 1);
          }),
        };
      }),
      onDisconnect: vi.fn((handler) => {
        subscribers.disconnect.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.disconnect.indexOf(handler);
            if (index !== -1) subscribers.disconnect.splice(index, 1);
          }),
        };
      }),
      onLog: vi.fn((handler) => {
        subscribers.log.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.log.indexOf(handler);
            if (index !== -1) subscribers.log.splice(index, 1);
          }),
        };
      }),
      onSandboxStatus: vi.fn((handler) => {
        subscribers.sandboxStatus.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.sandboxStatus.indexOf(handler);
            if (index !== -1) subscribers.sandboxStatus.splice(index, 1);
          }),
        };
      }),
      onLogSettings: vi.fn((handler) => {
        subscribers.logSettings.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.logSettings.indexOf(handler);
            if (index !== -1) subscribers.logSettings.splice(index, 1);
          }),
        };
      }),
      onSavedConsoleLogs: vi.fn((handler) => {
        subscribers.savedConsoleLogs.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.savedConsoleLogs.indexOf(handler);
            if (index !== -1) subscribers.savedConsoleLogs.splice(index, 1);
          }),
        };
      }),
      onConnectError: vi.fn((handler) => {
        subscribers.connectError.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.connectError.indexOf(handler);
            if (index !== -1) subscribers.connectError.splice(index, 1);
          }),
        };
      }),
      onConnectTimeout: vi.fn((handler) => {
        subscribers.connectTimeout.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.connectTimeout.indexOf(handler);
            if (index !== -1) subscribers.connectTimeout.splice(index, 1);
          }),
        };
      }),
      onReconnect: vi.fn((handler) => {
        subscribers.reconnect.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.reconnect.indexOf(handler);
            if (index !== -1) subscribers.reconnect.splice(index, 1);
          }),
        };
      }),
      onReconnectAttempt: vi.fn((handler) => {
        subscribers.reconnectAttempt.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.reconnectAttempt.indexOf(handler);
            if (index !== -1) subscribers.reconnectAttempt.splice(index, 1);
          }),
        };
      }),
      onReconnectError: vi.fn((handler) => {
        subscribers.reconnectError.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.reconnectError.indexOf(handler);
            if (index !== -1) subscribers.reconnectError.splice(index, 1);
          }),
        };
      }),
      onReconnectFailed: vi.fn((handler) => {
        subscribers.reconnectFailed.push(handler);
        return {
          unsubscribe: vi.fn(() => {
            const index = subscribers.reconnectFailed.indexOf(handler);
            if (index !== -1) subscribers.reconnectFailed.splice(index, 1);
          }),
        };
      }),

      // Test helpers
      emitConnect: () => {
        subscribers.connect.forEach((handler) => handler());
      },
      emitDisconnect: (reason: string) => {
        subscribers.disconnect.forEach((handler) => handler(reason));
      },
      emitLog: (logData: ConsoleLogEntry) => {
        // Ensure we have a unique ID if not provided
        const logWithId = {
          ...logData,
          id:
            logData.id ||
            `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        };
        subscribers.log.forEach((handler) => handler(logWithId));
      },
      emitSandboxStatus: (statusData: SandboxStatusData) => {
        subscribers.sandboxStatus.forEach((handler) => handler(statusData));
      },
      emitLogSettings: (settingsData: LogSettings) => {
        subscribers.logSettings.forEach((handler) => handler(settingsData));
      },
      emitSavedConsoleLogs: (logs: ConsoleLogEntry[]) => {
        subscribers.savedConsoleLogs.forEach((handler) => handler(logs));
      },
      emitConnectError: (error: Error) => {
        subscribers.connectError.forEach((handler) => handler(error));
      },
      emitConnectTimeout: () => {
        subscribers.connectTimeout.forEach((handler) => handler());
      },
      emitReconnect: (attemptNumber: number) => {
        subscribers.reconnect.forEach((handler) => handler(attemptNumber));
      },
      emitReconnectAttempt: (attemptNumber: number) => {
        subscribers.reconnectAttempt.forEach((handler) =>
          handler(attemptNumber),
        );
      },
      emitReconnectError: (error: Error) => {
        subscribers.reconnectError.forEach((handler) => handler(error));
      },
      emitReconnectFailed: () => {
        subscribers.reconnectFailed.forEach((handler) => handler());
      },
    };
  };

  const createMockDeploymentService = () => ({
    // Add necessary methods for DeploymentClientService
    getCloudFormationEvents: vi.fn(),
    getSavedCloudFormationEvents: vi.fn(),
    onCloudFormationEvents: vi.fn(() => ({ unsubscribe: vi.fn() })),
    onSavedCloudFormationEvents: vi.fn(() => ({ unsubscribe: vi.fn() })),
    onCloudFormationEventsError: vi.fn(() => ({ unsubscribe: vi.fn() })),
    onDeploymentError: vi.fn(() => ({ unsubscribe: vi.fn() })),
  });

  let mockSandboxService: ReturnType<typeof createMockSandboxService>;
  let mockDeploymentService: ReturnType<typeof createMockDeploymentService>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSandboxService = createMockSandboxService();
    mockDeploymentService = createMockDeploymentService();

    vi.mocked(socketClientContext.useSandboxClientService).mockReturnValue(
      mockSandboxService as unknown as SandboxClientService,
    );
    vi.mocked(socketClientContext.useDeploymentClientService).mockReturnValue(
      mockDeploymentService as unknown as DeploymentClientService,
    );

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders correctly with initial state', () => {
    render(<App />);

    // Check that main layout components are rendered
    expect(screen.getByTestId('header-component')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-component')).toBeInTheDocument();
    expect(screen.getByText('Console Logs')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();

    // Console Viewer should be visible (initial active tab)
    expect(screen.getByTestId('console-viewer')).toBeInTheDocument();

    // Deployment progress should be rendered
    expect(screen.getByTestId('deployment-progress')).toBeInTheDocument();

    // No alerts should be visible initially
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('establishes socket connection and requests sandbox status', async () => {
    render(<App />);

    // Emit connect event
    act(() => {
      mockSandboxService.emitConnect();
    });

    // Advance timers to trigger the delayed status request
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Check that getSandboxStatus was called
    expect(mockSandboxService.getSandboxStatus).toHaveBeenCalled();
  });

  it('updates state on sandbox status change', async () => {
    render(<App />);

    // Emit initial connect
    act(() => {
      mockSandboxService.emitConnect();
    });

    // Emit a status update
    act(() => {
      mockSandboxService.emitSandboxStatus({
        status: 'running' as SandboxStatus,
        identifier: 'sandbox-123',
      } as SandboxStatusData);
    });

    // Check that header shows the updated status - using within to specify the container
    const headerElement = screen.getByTestId('header-component');
    expect(
      within(headerElement).getByText(/Status: running/i),
    ).toBeInTheDocument();

    // Emit another status update
    act(() => {
      mockSandboxService.emitSandboxStatus({
        status: 'nonexistent' as SandboxStatus,
      } as SandboxStatusData);
    });
  });

  it('shows sandbox options modal when starting sandbox', async () => {
    render(<App />);

    // Click start button
    act(() => {
      screen.getByText('Start Sandbox').click();
    });

    // Check modal is shown
    const modal = screen.getByTestId('sandbox-options-modal');
    expect(modal).toHaveStyle({ display: 'block' });

    // Click Start in modal
    act(() => {
      screen.getByTestId('sandbox-options-start').click();
    });

    // Check startSandboxWithOptions was called
    expect(mockSandboxService.startSandboxWithOptions).toHaveBeenCalled();

    // Check modal is closed
    expect(modal).toHaveStyle({ display: 'none' });
  });

  it('updates log settings via modal', async () => {
    render(<App />);

    // Open settings
    act(() => {
      screen.getByText('Open Settings').click();
    });

    // Check getLogSettings was called
    expect(mockSandboxService.getLogSettings).toHaveBeenCalled();

    // Check modal is shown
    const modal = screen.getByTestId('log-settings-modal');
    expect(modal).toHaveStyle({ display: 'block' });

    // Click Save in modal
    act(() => {
      screen.getByTestId('log-settings-save').click();
    });

    // Check saveLogSettings was called with updated settings
    expect(mockSandboxService.saveLogSettings).toHaveBeenCalledWith({
      maxLogSizeMB: 100,
    });

    // Check modal is closed
    expect(modal).toHaveStyle({ display: 'none' });
  });

  it('handles stopping and deleting sandbox', async () => {
    render(<App />);

    // Click stop button
    act(() => {
      screen.getByText('Stop Sandbox').click();
    });

    // Check stopSandbox was called
    expect(mockSandboxService.stopSandbox).toHaveBeenCalled();

    // Click delete button
    act(() => {
      screen.getByText('Delete Sandbox').click();
    });

    // Check deleteSandbox was called
    expect(mockSandboxService.deleteSandbox).toHaveBeenCalled();
  });

  it('handles tab switching', async () => {
    render(<App />);

    // Initially logs tab should be active
    expect(screen.getByTestId('tab-logs')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('tab-resources')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByTestId('console-viewer')).toBeInTheDocument();

    // Click Resources tab
    act(() => {
      screen.getByTestId('tab-resources').click();
    });

    // Now resources tab should be active
    expect(screen.getByTestId('tab-logs')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByTestId('tab-resources')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('resource-console')).toBeInTheDocument();
  });

  it('handles connection errors', async () => {
    render(<App />);

    // Emit connect error
    act(() => {
      mockSandboxService.emitConnectError(new Error('Connection failed'));
    });

    // Check error alert is shown
    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(
      screen.getByText(/DevTools process was interrupted/i),
    ).toBeInTheDocument();

    // Check error log
    expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
  });

  it('handles reconnection attempts', async () => {
    render(<App />);

    // Emit initial connect
    act(() => {
      mockSandboxService.emitConnect();
    });

    // Simulate disconnect
    act(() => {
      mockSandboxService.emitDisconnect('transport close');
    });

    // Check disconnection log
    expect(screen.getByText(/Disconnected from server/i)).toBeInTheDocument();

    // Simulate reconnect
    act(() => {
      mockSandboxService.emitReconnect(1);
    });

    // Check that getSandboxStatus was called after reconnection
    expect(mockSandboxService.getSandboxStatus).toHaveBeenCalled();
  });

  it('handles deployment completion events', async () => {
    render(<App />);

    // Emit status with deployment completion
    act(() => {
      mockSandboxService.emitSandboxStatus({
        status: 'running' as SandboxStatus,
        deploymentCompleted: true,
        timestamp: '2023-01-01T12:00:00Z',
      } as SandboxStatusData);
    });

    // Check for deployment completion log
    expect(
      screen.getByText(/Deployment completed successfully/i),
    ).toBeInTheDocument();
  });

  it('correctly cleans up on unmount', () => {
    const { unmount } = render(<App />);

    // Unmount component
    unmount();

    // Check disconnect was called
    expect(mockSandboxService.disconnect).toHaveBeenCalled();
  });

  it('shows deployment in progress alert when status is deploying', async () => {
    render(<App />);

    // Emit status update with deploying status
    act(() => {
      mockSandboxService.emitSandboxStatus({
        status: 'deploying' as SandboxStatus,
      } as SandboxStatusData);
    });

    // Check for deployment in progress alert
    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
    expect(screen.getByText(/Deployment in Progress/i)).toBeInTheDocument();
  });


  it('periodically checks status when in unknown state', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // Silence console logs

    render(<App />);

    // Emit connect
    act(() => {
      mockSandboxService.emitConnect();
    });

    // Reset the mock to track new calls
    mockSandboxService.getSandboxStatus.mockClear();

    // Fast forward to trigger the periodic check
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should request status again after timeout
    expect(mockSandboxService.getSandboxStatus).toHaveBeenCalled();
    expect(screen.getByText(/Requesting sandbox status/i)).toBeInTheDocument();
  });

  it('loads saved logs when connected', async () => {
    render(<App />);

    // Emit connect
    act(() => {
      mockSandboxService.emitConnect();
    });

    // Check that loadConsoleLogs was called
    expect(mockSandboxService.loadConsoleLogs).toHaveBeenCalled();
  });

  it('resets loading states when sandbox status changes', async () => {
    render(<App />);

    // Start sandbox (which sets isStartingLoading to true)
    act(() => {
      screen.getByText('Start Sandbox').click();
    });

    // Emit status update to running
    act(() => {
      mockSandboxService.emitSandboxStatus({
        status: 'running' as SandboxStatus,
      } as SandboxStatusData);
    });

    // Check that Start Sandbox button is not disabled
    expect(screen.getByText('Start Sandbox')).not.toBeDisabled();
  });

  it('sets up ping interval for connection health', async () => {
    render(<App />);

    // Check that startPingInterval was called with 30000ms
    expect(mockSandboxService.startPingInterval).toHaveBeenCalledWith(30000);
  });

  it('handles stopping devtools process', async () => {
    render(<App />);

    // Click stop devtools button
    act(() => {
      screen.getByText('Stop DevTools').click();
    });

    // Check stopDevTools was called
    expect(mockSandboxService.stopDevTools).toHaveBeenCalled();

    // Check log was added
    expect(screen.getByText(/Stopping DevTools process/i)).toBeInTheDocument();
  });

  it('handles modal dismissal', async () => {
    render(<App />);

    // Open options modal
    act(() => {
      screen.getByText('Start Sandbox').click();
    });

    // Dismiss modal
    act(() => {
      screen.getByTestId('sandbox-options-cancel').click();
    });

    // Check modal is closed
    expect(screen.getByTestId('sandbox-options-modal')).toHaveStyle({
      display: 'none',
    });

    // Open settings modal
    act(() => {
      screen.getByText('Open Settings').click();
    });

    // Check modal is shown
    const settingsModal = screen.getByTestId('log-settings-modal');
    expect(settingsModal).toHaveStyle({ display: 'block' });

    // Dismiss modal
    act(() => {
      screen.getByTestId('log-settings-cancel').click();
    });

    // Check modal is closed
    expect(settingsModal).toHaveStyle({ display: 'none' });
  });
});
