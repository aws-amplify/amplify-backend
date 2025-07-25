import { useState, useEffect, useRef } from 'react';
import ConsoleViewer from './components/ConsoleViewer';
import Header from './components/Header';
import ResourceConsole from './components/ResourceConsole';
import DeploymentProgress from './components/DeploymentProgress';
import SandboxOptionsModal from './components/SandboxOptionsModal';
import { DevToolsSandboxOptions, SandboxStatusData } from '../../shared/socket_types';
import LogSettingsModal, { LogSettings } from './components/LogSettingsModal';
import { SocketClientProvider } from './contexts/socket_client_context';
import {
  useSandboxClientService,
  useDeploymentClientService,
} from './contexts/socket_client_context';
import { SandboxStatus } from '@aws-amplify/sandbox';

import {
  AppLayout,
  Tabs,
  ContentLayout,
  SpaceBetween,
  Alert,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { ConsoleLogEntry } from '../../shared/socket_types';

/**
 * Main App component that wraps the application with the socket client provider
 */
function App() {
  return (
    <SocketClientProvider>
      <AppContent />
    </SocketClientProvider>
  );
}

/**
 * Inner App component that uses the services
 */
function AppContent() {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeTabId, setActiveTabId] = useState('logs');
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('unknown');
  const [sandboxIdentifier, setSandboxIdentifier] = useState<
    string | undefined
  >(undefined);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [logSettings, setLogSettings] = useState<LogSettings>({
    maxLogSizeMB: 50,
  });
  const [currentLogSizeMB, setCurrentLogSizeMB] = useState<number | undefined>(
    undefined,
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const statusRequestedRef = useRef<boolean>(false);
  const [isStartingLoading, setIsStartingLoading] = useState(false);
  const [isStoppingLoading, setIsStoppingLoading] = useState(false);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const sandboxClientService = useSandboxClientService();
  const deploymentClientService = useDeploymentClientService();

  const deploymentInProgress = sandboxStatus === 'deploying';

  const clearLogs = () => {
    setLogs([]);
    sandboxClientService.saveConsoleLogs([]);
  };

  // Load saved logs on mount
  useEffect(() => {
    if (connected) {
      sandboxClientService.loadConsoleLogs();
    }
  }, [connected, sandboxClientService]);

  // Save logs whenever they change
  useEffect(() => {
    if (logs.length > 0) {
      sandboxClientService.saveConsoleLogs(logs);
    }
  }, [logs, sandboxClientService]);

  useEffect(() => {
    // Register for sandbox status updates
    const unsubscribeSandboxStatus = sandboxClientService.onSandboxStatus(
      (data: SandboxStatusData) => {
        console.log(`[CLIENT] Status update received: ${data.status}`, data);

        setSandboxStatus((prevStatus) => {
          console.log(
            `[CLIENT] Updating sandboxStatus from ${prevStatus} to ${data.status}`,
          );
          return data.status;
        });

        if (data.identifier) {
          setSandboxIdentifier((prevId) => {
            console.log(
              `[CLIENT] Updating sandboxIdentifier from ${prevId} to ${data.identifier}`,
            );
            // Store the identifier in localStorage for other components to use
            if (data.identifier) {
              window.localStorage.setItem('sandboxIdentifier', data.identifier);
            }
            return data.identifier;
          });
        } else if (data.status === 'nonexistent') {
          setSandboxIdentifier((prevId) => {
            console.log(`[CLIENT] Clearing sandboxIdentifier from ${prevId}`);
            // Remove the identifier from localStorage
            window.localStorage.removeItem('sandboxIdentifier');
            return undefined;
          });
        }

        if (data.deploymentCompleted) {
          // Add deployment completion log
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              timestamp: data.timestamp || new Date().toISOString(),
              level: data.error ? 'ERROR' : 'SUCCESS',
              message:
                data.message ||
                (data.error
                  ? 'Deployment failed'
                  : 'Deployment completed successfully'),
            },
          ]);
        }

        // Force a re-render by updating a dummy state
        setLogs((prev) => [...prev]);
      },
    );

    // Handle connection events
    const unsubscribeConnect = sandboxClientService.onConnect(() => {
      console.log('Socket connected');
      setConnected(true);
      setConnectionError(null);
      // Add a short delay before requesting status to ensure socket handlers are set up
      setTimeout(() => {
        // Explicitly request sandbox status after a short delay
        if (!statusRequestedRef.current) {
          console.log('Requesting sandbox status after connection delay');
          sandboxClientService.getSandboxStatus();
          console.log('getSandboxStatus request sent'); // Confirm the request was sent
          statusRequestedRef.current = true;
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              level: 'INFO',
              message:
                'DevTools connected to Amplify Sandbox, requesting status...',
            },
          ]);
        } else {
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              level: 'INFO',
              message: 'DevTools reconnected to Amplify Sandbox',
            },
          ]);
        }
      }, 500); // 500ms delay
      sandboxClientService.getLogSettings();
    });

    // Handle connection errors
    const unsubscribeConnectError = sandboxClientService.onConnectError(
      (error) => {
        console.error('Socket connection error:', error);
        setConnectionError('true');
        setLogs((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: `Connection error: ${error.message}`,
          },
        ]);
      },
    );

    const unsubscribeConnectTimeout = sandboxClientService.onConnectTimeout(
      () => {
        console.error('Socket connection timeout');
        setConnectionError('true');
        setLogs((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: 'Connection timeout',
          },
        ]);
      },
    );

    // Add reconnection logging
    const unsubscribeReconnect = sandboxClientService.onReconnect(
      (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        // Request sandbox status after reconnection
        sandboxClientService.getSandboxStatus();
      },
    );

    const unsubscribeReconnectAttempt = sandboxClientService.onReconnectAttempt(
      (attemptNumber) => {
        console.log(`Socket reconnection attempt ${attemptNumber}`);
      },
    );

    const unsubscribeReconnectError = sandboxClientService.onReconnectError(
      (error) => {
        console.log('Socket reconnection error:', error);
      },
    );

    const unsubscribeReconnectFailed = sandboxClientService.onReconnectFailed(
      () => {
        console.log('Socket reconnection failed');
      },
    );

    // Subscribe to log events from the server
    const unsubscribeLog = sandboxClientService.onLog((logData) => {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: logData.timestamp,
          level: logData.level,
          message: logData.message,
        },
      ]);
    });

    const unsubscribeLogSettings = sandboxClientService.onLogSettings(
      (data) => {
        console.log('Received log settings:', data);
        if (data.maxLogSizeMB) {
          setLogSettings({ maxLogSizeMB: data.maxLogSizeMB });
        }
        if (data.currentSizeMB !== undefined) {
          setCurrentLogSizeMB(data.currentSizeMB);
        }
      },
    );

    const unsubscribeSavedConsoleLogs = sandboxClientService.onSavedConsoleLogs(
      (savedLogs) => {
        if (savedLogs.length > 0) {
          setLogs(savedLogs as ConsoleLogEntry[]);
        }
      },
    );

    // Handle disconnection
    const unsubscribeDisconnect = sandboxClientService.onDisconnect(
      (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        setConnected(false);
        setSandboxStatus('unknown');
        statusRequestedRef.current = false; // Reset so we request status on reconnect

        // Add to logs
        setLogs((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level: 'WARNING',
            message: `Disconnected from server: ${reason}`,
          },
        ]);

        // If not a normal disconnect, set error
        if (reason !== 'io client disconnect') {
          setConnectionError('true');
        }
      },
    );

    // Set up a periodic ping to check connection health
    const stopPing = sandboxClientService.startPingInterval(30000);

    // Clean up on unmount
    return () => {
      unsubscribeSandboxStatus.unsubscribe();
      unsubscribeConnect.unsubscribe();
      unsubscribeConnectError.unsubscribe();
      unsubscribeConnectTimeout.unsubscribe();
      unsubscribeReconnect.unsubscribe();
      unsubscribeReconnectAttempt.unsubscribe();
      unsubscribeReconnectError.unsubscribe();
      unsubscribeReconnectFailed.unsubscribe();
      unsubscribeDisconnect.unsubscribe();
      unsubscribeLog.unsubscribe();
      unsubscribeLogSettings.unsubscribe();
      unsubscribeSavedConsoleLogs.unsubscribe();
      stopPing.unsubscribe();
      clearLogs();
      sandboxClientService.disconnect();
    };
  }, [sandboxClientService]);

  // Effect to periodically check sandbox status if unknown
  useEffect(() => {
    if (!connected || sandboxStatus !== 'unknown') return;

    // Periodic status check
    const statusCheckInterval = setInterval(() => {
      console.log('Requesting sandbox status due to unknown state');
      sandboxClientService.getSandboxStatus();

      // Add a log entry to show we're still trying
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Requesting sandbox status...',
        },
      ]);
    }, 5000); // Check every 5 seconds

    // Force a status check after a short timeout
    const forceStatusCheck = setTimeout(() => {
      console.log('Forcing sandbox status check after timeout');
      sandboxClientService.getSandboxStatus();
    }, 2000); // Force a check after 2 seconds

    return () => {
      clearInterval(statusCheckInterval);
      clearTimeout(forceStatusCheck);
    };
  }, [sandboxStatus, connected, sandboxClientService]);

  // Reset loading states when sandbox status changes
  useEffect(() => {
    if (sandboxStatus !== 'unknown') {
      setIsStartingLoading(false);
    }

    // Reset stopping loading state when status changes from running to stopped
    if (sandboxStatus === 'stopped') {
      setIsStoppingLoading(false);
    }

    // Reset deleting loading state when status changes from deleting to nonexistent
    if (sandboxStatus === 'nonexistent') {
      setIsDeletingLoading(false);
    }

    // Reset all loading states if there was an error (status didn't change as expected)
    if (sandboxStatus !== 'deploying' && sandboxStatus !== 'deleting') {
      setIsStoppingLoading(false);
      setIsDeletingLoading(false);
    }
  }, [sandboxStatus]);

  // Add a timeout to reset loading state if sandbox initialization takes too long
  // This is to prevent the UI from being stuck in loading state indefinitely if we have sandbox errors that
  // do not cause a state change
  useEffect(() => {
    if (isStartingLoading) {
      const timeout = setTimeout(() => {
        setIsStartingLoading(false);
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(timeout);
    }
  }, [isStartingLoading]);

  const startSandbox = () => {
    setIsStartingLoading(true);
    setShowOptionsModal(true);
  };

  const handleStartSandboxWithOptions = (options: DevToolsSandboxOptions) => {
    setShowOptionsModal(false);

    sandboxClientService.startSandboxWithOptions(options);

    const optionsText =
      Object.keys(options).length > 0
        ? ` with options: ${JSON.stringify(options)}`
        : '';

    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Requesting to start sandbox${optionsText}...`,
      },
    ]);
  };

  const stopSandbox = () => {
    setIsStoppingLoading(true);
    sandboxClientService.stopSandbox();
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Requesting to stop sandbox...',
      },
    ]);
  };

  const deleteSandbox = () => {
    setIsDeletingLoading(true);
    sandboxClientService.deleteSandbox();
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Requesting to delete sandbox...',
      },
    ]);
  };

  const stopDevTools = () => {
    sandboxClientService.stopDevTools();
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Stopping DevTools process...',
      },
    ]);
  };

  const handleOpenSettings = () => {
    sandboxClientService.getLogSettings();
    setShowSettingsModal(true);
  };

  const handleSaveSettings = (settings: LogSettings) => {
    sandboxClientService.saveLogSettings(settings);
    setLogSettings(settings);
    setShowSettingsModal(false);

    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Log settings updated: Max size set to ${settings.maxLogSizeMB} MB`,
      },
    ]);
  };

  const mainContent = (
    <ContentLayout
      header={
        <Header
          connected={connected}
          sandboxStatus={sandboxStatus}
          sandboxIdentifier={sandboxIdentifier}
          onStartSandbox={startSandbox}
          onStopSandbox={stopSandbox}
          onDeleteSandbox={deleteSandbox}
          onStopDevTools={stopDevTools}
          onOpenSettings={handleOpenSettings}
          isStartingLoading={isStartingLoading}
          isStoppingLoading={isStoppingLoading}
          isDeletingLoading={isDeletingLoading}
        />
      }
    >
      {connectionError && (
        <Alert
          type="error"
          header="DevTools process was interrupted"
          dismissible={false}
        >
          Please restart it on the command line using:{' '}
          <strong>npx ampx sandbox devtools</strong>
        </Alert>
      )}

      {deploymentInProgress && (
        <Alert
          type="info"
          header="Deployment in Progress"
          dismissible
          onDismiss={() => {}}
        >
          A sandbox deployment is currently in progress. You can view the
          deployment details in the Console Logs tab.
        </Alert>
      )}

      <SpaceBetween size="l">
        <Tabs
          activeTabId={activeTabId}
          onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
          tabs={[
            {
              id: 'logs',
              label: 'Console Logs',
              content: (
                <SpaceBetween size="l">
                  <DeploymentProgress
                    deploymentClientService={deploymentClientService}
                    visible={true}
                    status={sandboxStatus}
                  />
                  <ConsoleViewer logs={logs} />
                </SpaceBetween>
              ),
            },
            {
              id: 'resources',
              label: 'Resources',
              content: <ResourceConsole sandboxStatus={sandboxStatus} />,
            },
          ]}
        />
      </SpaceBetween>
    </ContentLayout>
  );

  return (
    <>
      <AppLayout
        content={mainContent}
        navigationHide={true}
        toolsHide={true}
        maxContentWidth={2300}
        contentType="default"
        headerSelector="#header"
      />

      <SandboxOptionsModal
        visible={showOptionsModal}
        onDismiss={() => {
          setShowOptionsModal(false);
          setIsStartingLoading(false);
        }}
        onConfirm={handleStartSandboxWithOptions}
      />

      <LogSettingsModal
        visible={showSettingsModal}
        onDismiss={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        onClear={clearLogs}
        initialSettings={logSettings}
        currentSizeMB={currentLogSizeMB}
      />
    </>
  );
}

export default App;
