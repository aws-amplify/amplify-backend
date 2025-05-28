import { useState, useEffect, useRef } from 'react';
import './App.css';
import LogViewer from './components/LogViewer.js';
import Header from './components/Header.js';
import { io, Socket } from 'socket.io-client';

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

  return (
    <div className="App">
      <Header connected={connected} onClear={clearLogs} />
      <LogViewer logs={logs} />
    </div>
  );
}

export default App;
