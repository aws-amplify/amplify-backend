import { useEffect, useRef } from 'react';
import './LogViewer.css';

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
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Manual scroll to bottom
    if (logsEndRef.current) {
      const element = logsEndRef.current;
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

  return (
    <div className="log-viewer">
      {logs.map((log) => (
        <div key={log.id} className={`log-entry log-${log.level.toLowerCase()}`}>
          <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
          <span className="log-level">[{log.level}]</span>
          <span className="log-message">{log.message}</span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
};

export default LogViewer;
