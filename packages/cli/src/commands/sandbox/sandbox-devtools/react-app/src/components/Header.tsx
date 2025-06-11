import {
  Header as CloudscapeHeader,
  Button,
  StatusIndicator,
  SpaceBetween
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

interface HeaderProps {
  connected: boolean;
  onClear: () => void;
}

const Header = ({ connected, onClear }: HeaderProps) => {
  return (
    <CloudscapeHeader
      variant="h1"
      description={
        <StatusIndicator type={connected ? "success" : "error"}>
          {connected ? 'Connected' : 'Disconnected'}
        </StatusIndicator>
      }
      actions={
        <SpaceBetween direction="horizontal" size="m">
          <Button onClick={onClear} iconName="remove">Clear Logs</Button>
        </SpaceBetween>
      }
    >
      Amplify Sandbox DevTools
    </CloudscapeHeader>
  );
};

export default Header;
