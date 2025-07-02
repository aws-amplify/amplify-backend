import {
  Header as CloudscapeHeader,
  Button,
  StatusIndicator,
  SpaceBetween,
  Spinner,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { useState, useEffect } from 'react';
import { SandboxStatus } from '../App';

interface HeaderProps {
  connected: boolean;
  sandboxStatus: SandboxStatus;
  sandboxIdentifier?: string;
  onStartSandbox: () => void;
  onStopSandbox: () => void;
  onDeleteSandbox?: () => void;
  onStopDevTools?: () => void;
  onOpenSettings?: () => void;
}

const Header = ({
  connected,
  sandboxStatus,
  sandboxIdentifier,
  onStartSandbox,
  onStopSandbox,
  onDeleteSandbox,
  onStopDevTools,
  onOpenSettings,
}: HeaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusCheckTimeout, setStatusCheckTimeout] = useState<number>(0);

  // Reset loading state when sandbox status changes
  useEffect(() => {
    console.log(
      `[CLIENT] Header: sandboxStatus prop changed to ${sandboxStatus}`,
    );

    // Always reset loading state when status changes, regardless of the new state
    console.log(
      `[CLIENT] Header: Resetting isLoading to false due to status change: ${sandboxStatus}`,
    );
    setIsLoading(false);

    // If status is still unknown after a delay, increment the timeout counter
    // to show a more informative message
    if (sandboxStatus === 'unknown') {
      const timer = setTimeout(() => {
        setStatusCheckTimeout((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Reset timeout counter when we get a definitive status
      setStatusCheckTimeout(0);
    }
  }, [sandboxStatus]);

  const handleStartSandbox = () => {
    setIsLoading(true);
    onStartSandbox();
  };

  const handleStopSandbox = () => {
    setIsLoading(true);
    onStopSandbox();
  };

  const handleDeleteSandbox = () => {
    if (
      window.confirm(
        'Are you sure you want to delete the sandbox? This will remove all resources and cannot be undone.',
      )
    ) {
      setIsLoading(true);
      onDeleteSandbox?.();
    }
  };

  const handleStopDevTools = () => {
    if (
      window.confirm(
        'Are you sure you want to stop the DevTools process? This will close the DevTools interface.',
      )
    ) {
      onStopDevTools?.();
    }
  };

  const getSandboxStatusIndicator = () => {
    const statusText = sandboxIdentifier
      ? `Sandbox ${sandboxStatus === 'nonexistent' ? '' : `(${sandboxIdentifier}) `}`
      : 'Sandbox ';

    switch (sandboxStatus) {
      case 'running':
        return (
          <StatusIndicator type="success">{statusText}Running</StatusIndicator>
        );
      case 'stopped':
        return (
          <StatusIndicator type="warning">{statusText}Stopped</StatusIndicator>
        );
      case 'nonexistent':
        return <StatusIndicator type="error">No Sandbox</StatusIndicator>;
      case 'deploying':
        return (
          <StatusIndicator type="in-progress">
            {statusText}Deploying
          </StatusIndicator>
        );
      case 'deleting':
        return (
          <StatusIndicator type="in-progress">
            {statusText}Deleting
          </StatusIndicator>
        );
      default:
        // Show different messages based on how long we've been checking
        if (statusCheckTimeout === 0) {
          return (
            <StatusIndicator type="pending">
              Checking Sandbox Status
            </StatusIndicator>
          );
        } else if (statusCheckTimeout === 1) {
          return (
            <StatusIndicator type="pending">
              Still checking status...
            </StatusIndicator>
          );
        } else {
          return (
            <SpaceBetween direction="horizontal" size="xs">
              <Spinner size="normal" />
              <StatusIndicator type="pending">
                Status check taking longer than expected
              </StatusIndicator>
            </SpaceBetween>
          );
        }
    }
  };

  // Check if the sandbox is in deploying state
  const isDeploying = sandboxStatus === 'deploying';

  return (
    <CloudscapeHeader
      variant="h1"
      description={
        <SpaceBetween direction="horizontal" size="m">
          <StatusIndicator type={connected ? 'success' : 'error'}>
            {connected ? 'Connected' : 'Disconnected'}
          </StatusIndicator>
          {getSandboxStatusIndicator()}
        </SpaceBetween>
      }
      actions={
        <SpaceBetween direction="horizontal" size="m">
          {sandboxStatus === 'running' ? (
            <Button
              onClick={handleStopSandbox}
              iconName="close"
              loading={isLoading || isDeploying}
              disabled={!connected || sandboxStatus !== 'running'}
            >
              Stop Sandbox
            </Button>
          ) : (
            <Button
              onClick={handleStartSandbox}
              iconName="add-plus"
              variant="primary"
              loading={isLoading || isDeploying}
              disabled={!connected || isDeploying}
            >
              Start Sandbox
            </Button>
          )}
          {onDeleteSandbox && (
            <Button
              onClick={handleDeleteSandbox}
              iconName="remove"
              variant="link"
              loading={isLoading}
              disabled={
                !connected ||
                sandboxStatus === 'nonexistent' ||
                sandboxStatus === 'unknown' ||
                isDeploying
              }
            >
              Delete Sandbox
            </Button>
          )}
          {onOpenSettings && (
            <Button
              onClick={onOpenSettings}
              iconName="settings"
              variant="link"
              disabled={!connected}
            >
              Settings
            </Button>
          )}
          {/* <Button onClick={onClear} iconName="remove">Clear Logs</Button> */}
          {onStopDevTools && (
            <Button
              onClick={handleStopDevTools}
              iconName="status-stopped"
              variant="link"
              disabled={!connected}
            >
              Stop DevTools
            </Button>
          )}
        </SpaceBetween>
      }
    >
      Amplify Sandbox DevTools
    </CloudscapeHeader>
  );
};

export default Header;
