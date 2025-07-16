import {
  Header as CloudscapeHeader,
  Button,
  StatusIndicator,
  SpaceBetween,
  Spinner,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { useState, useEffect } from 'react';
import { SandboxStatus } from '@aws-amplify/sandbox';
import ConfirmationModal from './ConfirmationModal';

interface HeaderProps {
  connected: boolean;
  sandboxStatus: SandboxStatus;
  sandboxIdentifier?: string;
  onStartSandbox: () => void;
  onStopSandbox: () => void;
  onDeleteSandbox?: () => void;
  onStopDevTools?: () => void;
  onOpenSettings?: () => void;
  isStartingLoading?: boolean;
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
  isStartingLoading = false,
}: HeaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusCheckTimeout, setStatusCheckTimeout] = useState<number>(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showStopDevToolsConfirmation, setShowStopDevToolsConfirmation] =
    useState(false);

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
    onStartSandbox();
  };

  const handleStopSandbox = () => {
    setIsLoading(true);
    onStopSandbox();
  };

  const handleDeleteSandbox = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteSandbox = () => {
    setShowDeleteConfirmation(false);
    setIsLoading(true);
    onDeleteSandbox?.();
  };

  const cancelDeleteSandbox = () => {
    setShowDeleteConfirmation(false);
  };

  const handleStopDevTools = () => {
    setShowStopDevToolsConfirmation(true);
  };

  const confirmStopDevTools = () => {
    setShowStopDevToolsConfirmation(false);
    onStopDevTools?.();
  };

  const cancelStopDevTools = () => {
    setShowStopDevToolsConfirmation(false);
  };

  const getSandboxStatusIndicator = () => {
    const statusText =
      sandboxIdentifier && sandboxStatus !== 'nonexistent'
        ? `Sandbox (${sandboxIdentifier})`
        : 'Sandbox';

    switch (sandboxStatus) {
      case 'running':
        return (
          <StatusIndicator type="success">{statusText} Running</StatusIndicator>
        );
      case 'stopped':
        return (
          <StatusIndicator type="warning">{statusText} Stopped</StatusIndicator>
        );
      case 'nonexistent':
        return <StatusIndicator type="error">No Sandbox</StatusIndicator>;
      case 'deploying':
        return (
          <StatusIndicator type="in-progress">
            {statusText} Deploying
          </StatusIndicator>
        );
      case 'deleting':
        return (
          <StatusIndicator type="in-progress">
            {statusText} Deleting
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

  // Check if the sandbox is in deploying or deleting state
  const isDeploying = sandboxStatus === 'deploying';
  const isDeleting = sandboxStatus === 'deleting';

  return (
    <>
      <ConfirmationModal
        visible={showDeleteConfirmation}
        title="Delete Sandbox"
        message="Are you sure you want to delete the sandbox? This will remove all resources and cannot be undone."
        confirmButtonText="Delete"
        onConfirm={confirmDeleteSandbox}
        onCancel={cancelDeleteSandbox}
      />

      <ConfirmationModal
        visible={showStopDevToolsConfirmation}
        title="Stop DevTools"
        message="Are you sure you want to stop the DevTools process? This will close the DevTools interface."
        confirmButtonText="Stop"
        onConfirm={confirmStopDevTools}
        onCancel={cancelStopDevTools}
      />

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
                disabled={
                  !connected || sandboxStatus !== 'running' || isDeleting
                }
              >
                Stop Sandbox
              </Button>
            ) : (
              <Button
                onClick={handleStartSandbox}
                iconName="add-plus"
                variant="primary"
                loading={isStartingLoading || isDeploying}
                disabled={!connected || isDeploying || isDeleting}
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
                  isDeploying ||
                  isDeleting
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
    </>
  );
};

export default Header;
