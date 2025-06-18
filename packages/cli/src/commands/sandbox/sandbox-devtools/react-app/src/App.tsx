import { useState, useEffect, useRef } from 'react';
import LogViewer from './components/LogViewer';
import Header from './components/Header';
import ResourceConsole from './components/ResourceConsole';
import { io, Socket } from 'socket.io-client';
import { 
  AppLayout, 
  Tabs, 
  ContentLayout,
  SpaceBetween
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [activeTabId, setActiveTabId] = useState('logs');

  useEffect(() => {
    // Connect to Socket.IO server using the current hostname and port
    const currentUrl = window.location.origin;
    const socket = io(currentUrl);
    socketRef.current = socket;

    // Handle connection events
    socket.on('connect', () => {
      setConnected(true);
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'DevTools connected to Amplify Sandbox'
      }]);
    });

    // Handle log messages
    socket.on('log', (data) => {
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: data.timestamp,
        level: data.level,
        message: data.message
      }]);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const mainContent = (
    <ContentLayout
      header={<Header connected={connected} onClear={clearLogs} />}
    >
      <SpaceBetween size="l">
        <Tabs
          activeTabId={activeTabId}
          onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
          tabs={[
            {
              id: 'logs',
              label: 'Console Logs',
              content: <LogViewer logs={logs} />
            },
            {
              id: 'resources',
              label: 'Resources',
              content: <ResourceConsole socket={socketRef.current} />
            }
          ]}
        />
      </SpaceBetween>
    </ContentLayout>
  );

  return (
    <AppLayout
      content={mainContent}
      navigationHide={true}
      toolsHide={true}
      maxContentWidth={1800}
      contentType="default"
      headerSelector="#header"
    />
  );
}

export default App;
