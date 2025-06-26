import { useEffect, useRef, useState } from 'react';
import {
  Table,
  Box,
  Container,
  StatusIndicator,
  TextContent,
  SpaceBetween,
  Header,
  Multiselect,
  FormField,
  Input,
  Grid
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

interface ConsoleViewerProps {
  logs: LogEntry[];
}

const cleanAnsiCodes = (text: string): string => {
  // This regex handles various ANSI escape sequences including colors, bold, dim, etc.
  return text.replace(/\u001b\[\d+(;\d+)*m|\[2m|\[22m|\[1m|\[36m|\[39m/g, '');
};

const ConsoleViewer = ({ logs }: ConsoleViewerProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLogLevels, setSelectedLogLevels] = useState<string[]>([]);
  const [availableLogLevels, setAvailableLogLevels] = useState<{label: string, value: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll] = useState<boolean>(true);
  
  // Extract unique log levels from logs
  useEffect(() => {
    const uniqueLevels = [...new Set(logs.map(log => log.level))];
    setAvailableLogLevels(
      uniqueLevels.map(level => ({
        label: level,
        value: level
      }))
    );
  }, [logs]);
  

  const filteredLogs = logs.filter(log => {

    const matchesLevel = selectedLogLevels.length === 0 || selectedLogLevels.includes(log.level);
    

    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.level.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.timestamp.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesLevel && matchesSearch;
  });

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

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
      case 'debug':
        return 'pending'; 
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
      width: 150
    },
    {
      id: 'message',
      header: 'Message',
      cell: (item: LogEntry) => {
        const cleanedMessage = cleanAnsiCodes(item.message);
        return cleanedMessage;
      },
      width: 'auto'
    }
  ];

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
        
        <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
          <FormField label="Filter by log level">
            <Multiselect
              selectedOptions={selectedLogLevels.map(level => ({ label: level, value: level }))}
              onChange={({ detail }) => 
                setSelectedLogLevels(detail.selectedOptions.map(option => option.value as string))
              }
              options={availableLogLevels}
              placeholder="Select log levels to filter"
              filteringType="auto"
              deselectAriaLabel={option => `Remove ${option.label}`}
            />
          </FormField>
          
          <FormField label="Search logs">
            <Input
              value={searchQuery}
              onChange={({ detail }) => setSearchQuery(detail.value)}
              placeholder="Search in logs..."
            />
          </FormField>
        </Grid>
        
        <div 
          style={{ 
            overflow: 'auto', 
            maxHeight: 'calc(100vh - 300px)',
            display: 'flex',
            flexDirection: 'column'
          }} 
          ref={scrollContainerRef}
        >
          <Table
            columnDefinitions={columnDefinitions}
            items={filteredLogs}
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

export default ConsoleViewer;
