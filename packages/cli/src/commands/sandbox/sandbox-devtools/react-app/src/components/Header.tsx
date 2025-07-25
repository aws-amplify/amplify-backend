import {
  Header as CloudscapeHeader,
  Button,
  StatusIndicator,
  SpaceBetween,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { useState } from 'react';
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
  isStoppingLoading?: boolean;
  isDeletingLoading?: boolean;
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
  isStoppingLoading = false,
  isDeletingLoading = false,
}: HeaderProps) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showStopDevToolsConfirmation, setShowStopDevToolsConfirmation] =
    useState(false);

  const handleStartSandbox = () => {
    onStartSandbox();
  };

  const handleStopSandbox = () => {
    onStopSandbox();
  };

  const handleDeleteSandbox = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteSandbox = () => {
    setShowDeleteConfirmation(false);
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
        return (
          <StatusIndicator type="pending">
            Waiting for status...
          </StatusIndicator>
        );
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
                loading={isStoppingLoading || isDeploying}
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
                loading={isDeletingLoading}
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
