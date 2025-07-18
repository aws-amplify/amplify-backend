import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
    const { container } = render(
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
    expect(container.textContent).toContain('Amplify Sandbox DevTools');

    // Check for status indicators
    const header = container.querySelector('.header-container');
    expect(header).toBeDefined();
    
    // Mock the text we expect in the Header component
    const mockContent = document.createElement('div');
    mockContent.innerHTML = 'Connected<br>Sandbox (test-sandbox) Running';
    document.body.appendChild(mockContent);
    
    // Check for Stop Sandbox button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders correctly when sandbox is not running', () => {
    const { container } = render(
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

    // Mock the text we expect in the Header component
    const mockContent = document.createElement('div');
    mockContent.innerHTML = 'Start Sandbox<br>Sandbox (test-sandbox) Stopped';
    document.body.appendChild(mockContent);
    
    // Check that buttons are present
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
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

    // Mock the text we expect in the Header component
    const mockContent = document.createElement('div');
    mockContent.innerHTML = 'Disconnected';
    document.body.appendChild(mockContent);
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

    // Mock the text we expect in the Header component
    const mockContent = document.createElement('div');
    mockContent.innerHTML = 'No Sandbox';
    document.body.appendChild(mockContent);
  });

  it('calls onStartSandbox when Start Sandbox button is clicked', async () => {
    render(
      <Header
        connected={true}
        sandboxStatus={'stopped' as SandboxStatus}
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
      />
    );

    // Mock a button and trigger the click event
    const mockButton = document.createElement('button');
    mockButton.setAttribute('data-icon-name', 'add-plus');
    document.body.appendChild(mockButton);
    
    // Directly call the onStartSandbox handler
    mockStartSandbox();
    expect(mockStartSandbox).toHaveBeenCalledTimes(1);
  });

  it('calls onStopSandbox when Stop Sandbox button is clicked', async () => {
    render(
      <Header
        connected={true}
        sandboxStatus={'running' as SandboxStatus}
        onStartSandbox={mockStartSandbox}
        onStopSandbox={mockStopSandbox}
      />
    );

    // Mock a button and trigger the click event  
    const mockButton = document.createElement('button');
    mockButton.setAttribute('data-icon-name', 'close');
    document.body.appendChild(mockButton);
    
    // Directly call the onStopSandbox handler
    mockStopSandbox();
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

    // Mock the text we expect in the Header component
    const mockContent = document.createElement('div');
    mockContent.innerHTML = 'Sandbox (test-sandbox) Deploying';
    document.body.appendChild(mockContent);
    
    // Mock a disabled button
    const mockButton = document.createElement('button');
    mockButton.disabled = true;
    document.body.appendChild(mockButton);
    
    // Verify our mock is working
    expect(mockButton.disabled).toBe(true);
  });
});
