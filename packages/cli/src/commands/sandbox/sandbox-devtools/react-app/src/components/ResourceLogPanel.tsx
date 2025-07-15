import React, { useState, useEffect, useRef } from 'react';
import {
  LogEntry,
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
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testInput, setTestInput] = useState<string>('{}');
  const [testOutput, setTestOutput] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const isLambdaFunction = resourceType === 'AWS::Lambda::Function';
  const isLogGroupNotFoundError = error?.includes("log group doesn't exist");

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
    // Clear logs
    setLogs([]);
    setTestOutput('');

    // Request saved logs when panel opens
    loggingClientService.viewResourceLogs(resourceId);

    // Set up a periodic refresh for logs when viewing
    const refreshInterval = setInterval(() => {
      loggingClientService.getSavedResourceLogs(resourceId);
    }, 2000); // Refresh every 2 seconds to match server-side polling

    // Listen for log entries
    const handleResourceLogs = (data: {
      resourceId: string;
      logs: LogEntry[];
    }) => {
      if (data.resourceId === resourceId) {
        // Add new logs to the existing logs
        setLogs((prevLogs) => [...prevLogs, ...data.logs]);
      }
    };

    // Listen for saved logs
    const handleSavedResourceLogs = (data: {
      resourceId: string;
      logs: LogEntry[];
    }) => {
      if (data.resourceId === resourceId) {
        setLogs(data.logs);
      }
    };

    // Listen for errors
    const handleLogStreamError = (data: {
      resourceId: string;
      error?: string;
      status: string;
    }) => {
      if (data.resourceId === resourceId && data.error) {
        setError(data.error);
        setTimeout(() => {
          setError(null);
        }, 10000);
      }
    };

    // Listen for Lambda test results
    const handleLambdaTestResult = (data: {
      resourceId: string;
      result?: string;
      error?: string;
    }) => {
      if (data.resourceId === resourceId) {
        setTesting(false);
        if (data.error) {
          setTestOutput(`Error: ${data.error}`);
        } else {
          setTestOutput(data.result || 'No output');
        }
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

      unsubscribeResourceLogs();
      unsubscribeSavedResourceLogs();
      unsubscribeLogStreamError();
      unsubscribeLambdaTestResult();

      // Clear the refresh interval
      clearInterval(refreshInterval);
    };
  }, [loggingClientService, resourceId]);

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
    toggleResourceLogging(resourceId, resourceType, !isRecording);
  };

  const handleTestFunction = () => {
    if (!isLambdaFunction) return;

    setTesting(true);
    setTestOutput('');

    loggingClientService.testLambdaFunction(resourceId, resourceId, testInput);
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              {consoleUrl && !deploymentInProgress && (
                <Link href={consoleUrl} external>
                  View in AWS Console
                </Link>
              )}
              <Button
                onClick={toggleRecording}
                variant={isRecording ? 'normal' : 'primary'}
                disabled={!!deploymentInProgress}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
                {deploymentInProgress && ' (disabled during deployment)'}
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
        {isRecording ? (
          <StatusIndicator type="success">Recording logs</StatusIndicator>
        ) : (
          <StatusIndicator type="info">Not recording logs</StatusIndicator>
        )}

        {isLogGroupNotFoundError ? (
          <Alert
            type="info"
            header="Log group not found"
            dismissible
            onDismiss={() => setError(null)}
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
                value={testInput}
                onChange={({ detail }) => setTestInput(detail.value)}
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
          style={{
            height: '650px',
            maxHeight: '650px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            backgroundColor: '#000',
            color: '#fff',
            padding: '10px',
            borderRadius: '4px',
            display: 'block',
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
