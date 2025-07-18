import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { SandboxStatus } from '@aws-amplify/sandbox';

describe('Header Component', () => {
  const mockStartSandbox = vi.fn();
  const mockStopSandbox = vi.fn();
  const mockDeleteSandbox = vi.fn();
  const mockStopDevTools = vi.fn();
  const mockOpenSettings = vi.fn();
  
  beforeEach(() => {
    mockStartSandbox.mockReset();
    mockStopSandbox.mockReset();
    mockDeleteSandbox.mockReset();
    mockStopDevTools.mockReset();
    mockOpenSettings.mockReset();
  });
  
  it('renders correctly when connected and sandbox is running', () => {
    render(
      <Header
        connected={true}
        sandboxStatus={'running' as SandboxStatus}
        sandboxIdentifier="test-sandbox"
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
        onDeleteSandbox={mockDeleteSandbox}
        onStopDevTools={mockStopDevTools}
        onOpenSettings={mockOpenSettings}
      />
    );
    
    // Check for title
    expect(screen.getByText(/Amplify Sandbox DevTools/i)).toBeInTheDocument();
    
    const headerText = screen.getByText(/Amplify Sandbox DevTools/i).parentElement?.textContent;
    expect(headerText).toContain('test-sandbox');
    
    // Check for Stop Sandbox button
    const stopButton = screen.getByRole('button', { name: /Stop Sandbox/i });
    expect(stopButton).toBeInTheDocument();
  });
  
  it('renders correctly when sandbox is not running', () => {
    render(
      <Header
        connected={true}
        sandboxStatus={'stopped' as SandboxStatus}
        sandboxIdentifier="test-sandbox"
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
        onDeleteSandbox={mockDeleteSandbox}
        onStopDevTools={mockStopDevTools}
        onOpenSettings={mockOpenSettings}
      />
    );
    
    // Check for sandbox identifier - it might be inside a StatusIndicator
    const headerText = screen.getByText(/Amplify Sandbox DevTools/i).parentElement?.textContent;
    expect(headerText).toContain('test-sandbox');
    
    // Check for Start Sandbox button
    const startButton = screen.getByRole('button', { name: /Start Sandbox/i });
    expect(startButton).toBeInTheDocument();
  });
  
  it('renders correctly when disconnected', () => {
    render(
      <Header
        connected={false}
        sandboxStatus={'unknown' as SandboxStatus}
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
      />
    );
    
    // Check for disconnected status - it's inside a StatusIndicator
    const disconnectedStatus = screen.getAllByRole('status').find(el => el.textContent?.includes('Disconnected'));
    expect(disconnectedStatus).toBeInTheDocument();
  });
  
  it('renders correctly when sandbox does not exist', () => {
    render(
      <Header
        connected={true}
        sandboxStatus={'nonexistent' as SandboxStatus}
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
        onDeleteSandbox={mockDeleteSandbox}
      />
    );
    
    const statusIndicators = screen.getAllByRole('status');
    const noSandboxIndicator = statusIndicators.find(indicator => 
      indicator.textContent?.includes('No Sandbox')
    );
    expect(noSandboxIndicator).toBeInTheDocument();
    
    // Also check for Start Sandbox button which should be present when no sandbox exists
    const startButton = screen.getByRole('button', { name: /Start Sandbox/i });
    expect(startButton).toBeInTheDocument();
  });
  
  it('calls onStartSandbox when Start Sandbox button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <Header
        connected={true}
        sandboxStatus={'stopped' as SandboxStatus}
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
      />
    );
    
    // Find and click the Start Sandbox button
    const startButton = screen.getByRole('button', { name: /Start Sandbox/i });
    await user.click(startButton);
    
    // Verify the handler was called
    expect(mockStartSandbox).toHaveBeenCalledTimes(1);
  });
  
  it('calls onStopSandbox when Stop Sandbox button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <Header
        connected={true}
        sandboxStatus={'running' as SandboxStatus}
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
      />
    );
    
    // Find and click the Stop Sandbox button
    const stopButton = screen.getByRole('button', { name: /Stop Sandbox/i });
    await user.click(stopButton);
    
    // Verify the handler was called
    expect(mockStopSandbox).toHaveBeenCalledTimes(1);
  });
  
  it('disables buttons when deploying', () => {
    render(
      <Header
        connected={true}
        sandboxStatus={'deploying' as SandboxStatus}
        sandboxIdentifier="test-sandbox"
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
        onDeleteSandbox={mockDeleteSandbox}
      />
    );
    
    // Check for deploying status
    const deployingStatus = screen.getAllByRole('status').find(el => el.textContent?.includes('Deploying'));
    expect(deployingStatus).toBeInTheDocument();
    
    // Check that buttons are disabled during deployment
    const buttons = screen.getAllByRole('button');
    const actionButtons = buttons.filter(button => 
      button.textContent?.includes('Start') || 
      button.textContent?.includes('Stop') || 
      button.textContent?.includes('Delete')
    );
    
    // If there are action buttons, they should be disabled
    if (actionButtons.length > 0) {
      actionButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    }
  });
});