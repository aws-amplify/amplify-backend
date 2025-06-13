import { useEffect, useRef } from 'react';
import {
  Table,
  Box,
  Container,
  StatusIndicator,
  TextContent,
  SpaceBetween,
  Header
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer = ({ logs }: LogViewerProps) => {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableRef.current) {
      const element = tableRef.current;
      const parent = element.parentElement;
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [logs]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };

  // Map log level to StatusIndicator type
  const getStatusType = (level: string): "success" | "info" | "warning" | "error" | "pending" => {
    const normalizedLevel = typeof level === 'string' ? level.toLowerCase() : 'info';
    
    switch (normalizedLevel) {
      case 'error':
        return 'error';
      case 'warn':
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  // Define table columns
  const columnDefinitions = [
    {
      id: 'timestamp',
      header: 'Time',
      cell: (item: LogEntry) => formatTimestamp(item.timestamp),
      width: 100
    },
    {
      id: 'level',
      header: 'Level',
      cell: (item: LogEntry) => (
        <StatusIndicator type={getStatusType(item.level)}>
          {item.level}
        </StatusIndicator>
      ),
      width: 100
    },
    {
      id: 'message',
      header: 'Message',
      cell: (item: LogEntry) => item.message,
      width: 'auto'
    }
  ];

  // Empty state for when there are no logs
  const emptyState = (
    <Box textAlign="center" padding="m">
      <SpaceBetween size="m">
        <TextContent>
          <h3>No logs available</h3>
          <p>Logs will appear here when they are generated.</p>
        </TextContent>
      </SpaceBetween>
    </Box>
  );

  return (
    <Container
      disableContentPaddings={false}
      variant="default"
      fitHeight
    >
      <SpaceBetween size="m">
        <Header variant="h2">Console Logs</Header>
        <div ref={tableRef}>
          <Table
            columnDefinitions={columnDefinitions}
            items={logs}
            loadingText="Loading logs"
            trackBy="id"
            empty={emptyState}
            wrapLines
            stripedRows
            stickyHeader
            resizableColumns
          />
        </div>
      </SpaceBetween>
    </Container>
  );
};

export default LogViewer;
