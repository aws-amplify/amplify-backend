import { useState, useEffect, useRef } from 'react';
import ConsoleViewer from './components/ConsoleViewer';
import Header from './components/Header';
import ResourceConsole from './components/ResourceConsole';
import SandboxOptionsModal, {
  SandboxOptions,
} from './components/SandboxOptionsModal';
import { SocketClientProvider } from './contexts/socket_client_context';
import { useSandboxClientService } from './contexts/socket_client_context';
import {
  SandboxStatus,
  SandboxStatusData,
} from './services/sandbox_client_service';

// Define LogEntry interface for PR2 (will be replaced in PR3)
interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

import {
  AppLayout,
  Tabs,
  ContentLayout,
  SpaceBetween,
  Alert,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeTabId, setActiveTabId] = useState('logs');
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('unknown');
  const [sandboxIdentifier, setSandboxIdentifier] = useState<
    string | undefined
  >(undefined);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const statusRequestedRef = useRef<boolean>(false);
  const [isStartingLoading, setIsStartingLoading] = useState(false);

  const sandboxClientService = useSandboxClientService();

  const deploymentInProgress = sandboxStatus === 'deploying';

  const clearLogs = () => {
    setLogs([]);
  };

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
            return data.identifier;
          });
        } else if (data.status === 'nonexistent') {
          setSandboxIdentifier((prevId) => {
            console.log(`[CLIENT] Clearing sandboxIdentifier from ${prevId}`);
            return undefined;
          });
        }

        if (data.deploymentCompleted) {
          console.log(
            '[CLIENT] Deployment completed event received via sandboxStatus:',
            data,
          );

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

        if (data.error) {
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              level: 'ERROR',
              message: `Sandbox error: ${data.error}`,
            },
          ]);
        } else {
          if (!data.deploymentCompleted) {
            setLogs((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: data.identifier
                  ? `Sandbox status: ${data.status} (identifier: ${data.identifier})`
                  : `Sandbox status: ${data.status}`,
              },
            ]);
          }
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

    // Log messages will be implemented in PR3

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
      unsubscribeSandboxStatus();
      unsubscribeConnect();
      unsubscribeConnectError();
      unsubscribeConnectTimeout();
      unsubscribeReconnect();
      unsubscribeReconnectAttempt();
      unsubscribeReconnectError();
      unsubscribeReconnectFailed();
      unsubscribeDisconnect();
      stopPing();
      clearLogs();
      sandboxClientService.disconnect();
    };
  }, [sandboxClientService]);

  // Effect to periodically check sandbox status if unknown
  useEffect(() => {
    if (!connected) return;

    // If status is unknown, request it periodically
    if (sandboxStatus === 'unknown') {
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

      return () => clearInterval(statusCheckInterval);
    }
  }, [sandboxStatus, connected, sandboxClientService]);

  // Force a status check if we've been in unknown state for too long
  useEffect(() => {
    if (sandboxStatus === 'unknown' && connected) {
      const forceStatusCheck = setTimeout(() => {
        console.log('Forcing sandbox status check after timeout');
        sandboxClientService.getSandboxStatus();
      }, 2000); // Force a check after 2 seconds

      return () => clearTimeout(forceStatusCheck);
    }
  }, [sandboxStatus, connected, sandboxClientService]);

  // Reset loading state when sandbox status changes
  useEffect(() => {
    if (sandboxStatus !== 'unknown') {
      setIsStartingLoading(false);
    }
  }, [sandboxStatus]);

  const startSandbox = () => {
    setIsStartingLoading(true);
    setShowOptionsModal(true);
  };

  const handleStartSandboxWithOptions = (options: SandboxOptions) => {
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
          onOpenSettings={() => {}}
          isStartingLoading={isStartingLoading}
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
              content: <ConsoleViewer logs={logs} />,
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
        maxContentWidth={2000}
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
    </>
  );
}

export default App;
