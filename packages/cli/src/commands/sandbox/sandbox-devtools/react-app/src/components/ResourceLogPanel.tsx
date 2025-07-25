import React, { useState, useEffect, useRef } from 'react';
import {
  LoggingClientService,
} from '../services/logging_client_service';
import {
  Button,
  SpaceBetween,
  StatusIndicator,
  TextContent,
  Input,
  FormField,
  Header,
  Container,
  Link,
  Alert,
} from '@cloudscape-design/components';
import { LambdaTestResult, LogEntry, LogStreamStatus } from '../../../shared/socket_types';

interface ResourceLogPanelProps {
  loggingClientService: LoggingClientService;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  onClose: () => void;
  deploymentInProgress?: boolean;
  consoleUrl?: string | null;
  isLoggingActive: boolean;
  toggleResourceLogging: (
    resourceId: string,
    resourceType: string,
    startLogging: boolean,
  ) => void;
}

// Module-level cache for logs to persist between component instances
const logCache: Record<string, LogEntry[]> = {};

// Module-level cache for errors to persist between component instances
const errorCache: Record<string, string | null> = {};

// Module-level cache for Lambda test state
const testStateStore: Record<
  string,
  {
    isLoading: boolean;
    testInput: string;
    testOutput: string;
  }
> = {};

const ResourceLogPanel: React.FC<ResourceLogPanelProps> = ({
  loggingClientService,
  resourceId,
  resourceName,
  resourceType,
  onClose,
  deploymentInProgress,
  consoleUrl,
  isLoggingActive,
  toggleResourceLogging,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const isRecording = isLoggingActive;
  const [error, setError] = useState<string | null>(
    errorCache[resourceId] || null,
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Force a re-render when test state changes
  const [updateTrigger, setUpdateTrigger] = useState({});
  const forceUpdate = () => setUpdateTrigger({});

  // Initialize test state for this resource if needed
  if (!testStateStore[resourceId]) {
    testStateStore[resourceId] = {
      isLoading: false,
      testInput: '{}',
      testOutput: '',
    };
  }

  // Current resource's test state
  const testing = testStateStore[resourceId].isLoading;
  const testInput = testStateStore[resourceId].testInput;
  const testOutput = testStateStore[resourceId].testOutput;

  // State manipulation functions
  const setLoading = (targetResourceId: string, isLoading: boolean) => {
    if (testStateStore[targetResourceId]) {
      testStateStore[targetResourceId].isLoading = isLoading;
    } else {
      testStateStore[targetResourceId] = {
        isLoading,
        testInput: '{}',
        testOutput: '',
      };
    }
    forceUpdate();
  };

  const setTestInput = (targetResourceId: string, input: string) => {
    if (testStateStore[targetResourceId]) {
      testStateStore[targetResourceId].testInput = input;
    } else {
      testStateStore[targetResourceId] = {
        isLoading: false,
        testInput: input,
        testOutput: '',
      };
    }
    forceUpdate();
  };

  const setTestOutput = (targetResourceId: string, output: string) => {
    if (testStateStore[targetResourceId]) {
      testStateStore[targetResourceId].testOutput = output;
    } else {
      testStateStore[targetResourceId] = {
        isLoading: false,
        testInput: '{}',
        testOutput: output,
      };
    }
    forceUpdate();
  };

  const isLambdaFunction = resourceType === 'AWS::Lambda::Function';
  const isLogGroupNotFoundError = error?.includes("log group doesn't exist");

  // Auto-dismiss cached error after 10 seconds on initial load
  useEffect(() => {
    if (error && errorCache[resourceId]) {
      const timer = setTimeout(() => {
        errorCache[resourceId] = null;
        setError(null);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [resourceId, error]);

  const formatLambdaOutput = (output: string): string => {
    try {
      const parsed = JSON.parse(output);

      if (parsed.errorType) {
        return `Lambda Error: ${parsed.errorType}
Message: ${parsed.errorMessage}
Stack Trace:
${
  parsed.trace
    ?.map((line: string, index: number) => `  ${index + 1}. ${line}`)
    .join('\n') || 'No stack trace available'
}`;
      }

      if (parsed.statusCode) {
        return `Lambda Response (Status code: ${parsed.statusCode}):
${JSON.stringify(parsed.body, null, 2)}`;
      }

      return JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  };

  useEffect(() => {
    // Use cached logs if available, otherwise use empty array
    setLogs(logCache[resourceId] || []);

    // Request saved logs when panel opens
    loggingClientService.viewResourceLogs(resourceId);

    // Set up a periodic refresh for logs when viewing
    const refreshInterval = setInterval(() => {
      loggingClientService.getSavedResourceLogs(resourceId);
    }, 2000); // Refresh every 2 seconds to match server-side polling

    const handleResourceLogs = (data: {
      resourceId: string;
      logs: LogEntry[];
    }) => {
      // Always update the cache for the resource in the data
      const currentCachedLogs = logCache[data.resourceId] || [];
      logCache[data.resourceId] = [...currentCachedLogs, ...data.logs];

      // Only update the displayed logs if this is the active resource
      if (data.resourceId === resourceId) {
        setLogs(logCache[data.resourceId]);
      }
    };

    const handleSavedResourceLogs = (data: {
      resourceId: string;
      logs: LogEntry[];
    }) => {
      // Always update the cache for any resource
      logCache[data.resourceId] = data.logs;

      // Only update the displayed logs if this is the active resource
      if (data.resourceId === resourceId) {
        setLogs(data.logs);
      }
    };

    // Listen for errors - always cache errors regardless of active resource
    const handleLogStreamError = (data: LogStreamStatus) => {
      // Store error in cache for the specific resource
      if (data.error) {
        errorCache[data.resourceId] = data.error;

        // Only update UI if this is the active resource
        if (data.resourceId === resourceId) {
          setError(data.error);

          // Auto-dismiss error after 10 seconds
          setTimeout(() => {
            errorCache[data.resourceId] = null;
            if (data.resourceId === resourceId) {
              setError(null);
            }
          }, 10000);
        }
      }
    };

    // Listen for Lambda test results
    const handleLambdaTestResult = (data: LambdaTestResult) => {
      setLoading(data.resourceId, false);

      // Always save the output for this resource, regardless of which resource is currently displayed
      if (data.error) {
        setTestOutput(data.resourceId, `Error: ${data.error}`);
      } else {
        setTestOutput(data.resourceId, data.result || 'No output');
      }
    };

    const unsubscribeResourceLogs =
      loggingClientService.onResourceLogs(handleResourceLogs);
    const unsubscribeSavedResourceLogs =
      loggingClientService.onSavedResourceLogs(handleSavedResourceLogs);
    const unsubscribeLogStreamError =
      loggingClientService.onLogStreamError(handleLogStreamError);
    const unsubscribeLambdaTestResult = loggingClientService.onLambdaTestResult(
      handleLambdaTestResult,
    );

    return () => {
      // Clean up event listeners
      unsubscribeResourceLogs.unsubscribe();
      unsubscribeSavedResourceLogs.unsubscribe();
      unsubscribeLogStreamError.unsubscribe();
      unsubscribeLambdaTestResult.unsubscribe();

      // Clear the refresh interval
      clearInterval(refreshInterval);
    };
  }, [loggingClientService, resourceId, updateTrigger]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Preserve logs when stopping recording
  useEffect(() => {
    if (!isRecording && logs.length > 0) {
      loggingClientService.getSavedResourceLogs(resourceId);
    }
  }, [isRecording, resourceId, logs.length, loggingClientService]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  // Filter logs based on search query only
  const filteredLogs = logs.filter((log) => {
    // Filter by search query
    return (
      searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatTimestamp(log.timestamp)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  const toggleRecording = () => {
    // Clear errors when toggling recording state
    errorCache[resourceId] = null;
    setError(null);

    toggleResourceLogging(resourceId, resourceType, !isRecording);
  };

  const handleTestFunction = () => {
    if (!isLambdaFunction) return;

    // Set loading state for this specific resource only
    setLoading(resourceId, true);
    setTestOutput(resourceId, '');

    // Clear any previous errors when testing
    errorCache[resourceId] = null;
    setError(null);

    loggingClientService.testLambdaFunction(resourceId, resourceId, testInput);
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              {consoleUrl &&
                (deploymentInProgress ? (
                  <span style={{ color: '#888' }}>View in AWS Console</span>
                ) : (
                  <Link href={consoleUrl} external>
                    View in AWS Console
                  </Link>
                ))}
              <Button
                onClick={toggleRecording}
                variant={isRecording ? 'normal' : 'primary'}
                disabled={!!deploymentInProgress}
                data-testid="toggle-recording-button"
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              <Button onClick={onClose} variant="link">
                Close
              </Button>
            </SpaceBetween>
          }
        >
          {resourceName} Logs
        </Header>
      }
      disableContentPaddings={false}
      fitHeight
    >
      <SpaceBetween direction="vertical" size="m">
        {deploymentInProgress ? (
          <StatusIndicator type="in-progress">
            Deployment in progress - logging operations disabled
          </StatusIndicator>
        ) : isRecording ? (
          <StatusIndicator type="success">Recording logs</StatusIndicator>
        ) : (
          <StatusIndicator type="info">Not recording logs</StatusIndicator>
        )}

        {isLogGroupNotFoundError ? (
          <Alert
            type="info"
            header="Log group not found"
            dismissible
            onDismiss={() => {
              // Clear error from cache when dismissed
              errorCache[resourceId] = null;
              setError(null);
            }}
          >
            This resource hasn't produced any logs yet. Try using the resource
            first, then turn on logging again.
          </Alert>
        ) : error ? (
          <StatusIndicator type="error">Error: {error}</StatusIndicator>
        ) : null}

        <FormField label="Search logs">
          <Input
            value={searchQuery}
            onChange={({ detail }) => setSearchQuery(detail.value)}
            placeholder="Search in logs..."
          />
        </FormField>

        {isLambdaFunction && (
          <SpaceBetween direction="vertical" size="s">
            <FormField label="Test Input (JSON)">
              <Input
                value={testInput || '{}'}
                onChange={({ detail }) =>
                  setTestInput(resourceId, detail.value)
                }
                placeholder='{"key": "value"}'
                disabled={testing || deploymentInProgress}
              />
            </FormField>
            <Button
              onClick={handleTestFunction}
              loading={testing}
              disabled={deploymentInProgress}
            >
              Test Function
            </Button>
            {testOutput && (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  backgroundColor: testOutput.includes('Error')
                    ? '#fef2f2'
                    : '#f0fdf4',
                  padding: '10px',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                }}
              >
                <strong>Test Output:</strong>
                <br />
                {formatLambdaOutput(testOutput)}
              </div>
            )}
          </SpaceBetween>
        )}

        <div
          ref={logContainerRef}
          data-testid="log-container"
          style={{
            height: '600px',
            maxHeight: '600px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            backgroundColor: '#000',
            color: '#fff',
            padding: '10px',
            borderRadius: '4px',
            display: 'block',
            position: 'relative',
          }}
        >
          {filteredLogs.length === 0 ? (
            <TextContent>
              <p style={{ color: '#888' }}>
                {searchQuery ? 'No matching logs found' : 'No logs available'}
              </p>
            </TextContent>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index}>
                <span style={{ color: '#888' }}>
                  [{formatTimestamp(log.timestamp)}]
                </span>{' '}
                {log.message}
              </div>
            ))
          )}
        </div>

        <TextContent>
          <p>
            {filteredLogs.length} log entries{' '}
            {searchQuery && `(filtered from ${logs.length})`}
          </p>
        </TextContent>
      </SpaceBetween>
    </Container>
  );
};

export default ResourceLogPanel;
