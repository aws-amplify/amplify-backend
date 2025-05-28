import './Header.css';

interface HeaderProps {
  connected: boolean;
  onClear: () => void;
}

const Header = ({ connected, onClear }: HeaderProps) => {
  return (
    <header className="header">
      <div className="header-title">
        <h1>Amplify Sandbox DevTools</h1>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      <div className="header-controls">
        <button onClick={onClear}>Clear Logs</button>
      </div>
    </header>
  );
};

export default Header;
