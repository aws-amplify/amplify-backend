import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SandboxOptionsModal from './SandboxOptionsModal';
import { DevToolsSandboxOptions } from '../../../shared/socket_types';

describe('SandboxOptionsModal Component', () => {
  const mockOnDismiss = vi.fn();
  const mockOnConfirm = vi.fn();
  
  beforeEach(() => {
    mockOnDismiss.mockReset();
    mockOnConfirm.mockReset();
  });
  
  it('does not render when visible is false', () => {
    render(
      <SandboxOptionsModal
        visible={false}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    
    // Modal should not be visible
    expect(screen.queryByText('Sandbox Options')).not.toBeInTheDocument();
  });
  
  it('renders when visible is true', () => {
    render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    
    // Check for modal title
    expect(screen.getByText('Sandbox Options')).toBeInTheDocument();
    
    // Check for form fields
    expect(screen.getByLabelText(/Sandbox Identifier/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Directory to Watch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Exclude Paths/i)).toBeInTheDocument();
  });
  
  it('calls onDismiss when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    
    // Find and click the Cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);
    
    // Verify onDismiss was called
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
  
  it('calls onConfirm with default options when Start button is clicked with no changes', async () => {
    const user = userEvent.setup();
    
    render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    
    // Find and click the Start Sandbox button
    const startButton = screen.getByRole('button', { name: /Start Sandbox/i });
    await user.click(startButton);
    
    // Verify onConfirm was called with empty options (defaults)
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    const options = mockOnConfirm.mock.calls[0][0] as DevToolsSandboxOptions;
    expect(Object.keys(options).length).toBe(0);
  });
  
  it('shows logs filter fields when streamFunctionLogs is checked', async () => {
    const user = userEvent.setup();
    
    render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    
    // Initially, logs filter fields should not be visible
    expect(screen.queryByLabelText(/Logs Filter/i)).not.toBeInTheDocument();
    
    // Find and click the Stream function execution logs checkbox
    const checkbox = screen.getByLabelText(/Stream function execution logs/i);
    await user.click(checkbox);
    
    // Now logs filter fields should be visible
    expect(screen.getByLabelText(/Logs Filter/i)).toBeInTheDocument();
  });
  it('disables "once" checkbox when streamFunctionLogs is checked', async () => {
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    const streamLogsCheckbox = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
      input => input.closest('label')?.textContent?.includes('Stream function execution logs')
    );

    const onceCheckbox = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
      input => input.closest('label')?.textContent?.includes('Execute a single deployment')
    );

    expect(streamLogsCheckbox).toBeDefined();
    expect(onceCheckbox).toBeDefined();

    if (streamLogsCheckbox && onceCheckbox) {
      // Initially, once checkbox should be enabled
      expect(onceCheckbox.hasAttribute('disabled')).toBe(false);

      // Click stream logs checkbox
      await userEvent.click(streamLogsCheckbox);

      // Now once checkbox should be disabled
      expect(onceCheckbox.hasAttribute('disabled')).toBe(true);
    }
  });

  
  it('calls onConfirm with proper options when form fields are filled', async () => {
    const user = userEvent.setup();
    
    render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );
    
    // Find form inputs
    const identifierInput = screen.getByLabelText(/Sandbox Identifier/i);
    const dirInput = screen.getByLabelText(/Directory to Watch/i);
    const excludeInput = screen.getByLabelText(/Exclude Paths/i);
    
    // Set values in the form
    await user.clear(identifierInput);
    await user.type(identifierInput, "test-sandbox");
    
    await user.clear(dirInput);
    await user.type(dirInput, "./custom-dir");
    
    await user.clear(excludeInput);
    await user.type(excludeInput, "node_modules,dist");
    
    // Submit the form
    const startButton = screen.getByRole('button', { name: /Start Sandbox/i });
    await user.click(startButton);
    
    // Check that options are passed correctly
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    const options = mockOnConfirm.mock.calls[0][0] as DevToolsSandboxOptions;
    expect(options.identifier).toBe("test-sandbox");
    expect(options.dirToWatch).toBe("./custom-dir");
    expect(options.exclude).toBe("node_modules,dist");
  });
});