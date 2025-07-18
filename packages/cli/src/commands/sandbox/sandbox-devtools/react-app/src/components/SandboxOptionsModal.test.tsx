import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
    const { container } = render(
      <SandboxOptionsModal
        visible={false}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Modal should not be visible
    expect(container.textContent?.includes('Sandbox Options')).toBe(false);
  });

  it('renders when visible is true', () => {
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Check for modal title
    expect(container.textContent).toContain('Sandbox Options');

    // Check for form fields
    expect(container.textContent).toContain('Sandbox Identifier');
    expect(container.textContent).toContain('Directory to Watch');
    expect(container.textContent).toContain('Exclude Paths');
    expect(container.textContent).toContain('Outputs Format');
  });

  it('calls onDismiss when Cancel button is clicked', async () => {
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Find and click the Cancel button
    const cancelButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('Cancel')
    );

    expect(cancelButton).toBeDefined();

    if (cancelButton) {
      await userEvent.click(cancelButton);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    }
  });

  it('calls onConfirm with default options when Start button is clicked with no changes', async () => {
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Find and click the Start Sandbox button
    const startButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('Start Sandbox')
    );

    expect(startButton).toBeDefined();

    if (startButton) {
      await userEvent.click(startButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);

      // Empty options object should be passed since we didn't change any defaults
      const options = mockOnConfirm.mock.calls[0][0] as DevToolsSandboxOptions;
      expect(options).toEqual({});
    }
  });

  it('shows logs filter fields when streamFunctionLogs is checked', async () => {
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Initially, logs filter fields should not be visible
    expect(container.textContent?.includes('Logs Filter')).toBe(false);

    // Find and click the Stream function execution logs checkbox
    const checkbox = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
      input => input.closest('label')?.textContent?.includes('Stream function execution logs')
    );

    expect(checkbox).toBeDefined();

    if (checkbox) {
      await userEvent.click(checkbox);

      // Now logs filter fields should be visible
      expect(container.textContent).toContain('Logs Filter');
      expect(container.textContent).toContain('Logs Output File');
    }
  });

  it('disables "once" checkbox when streamFunctionLogs is checked', async () => {
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Find the checkboxes
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
    const { container } = render(
      <SandboxOptionsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onConfirm={mockOnConfirm}
      />
    );

    // Find form inputs
    const identifierInput = container.querySelector('input[placeholder="e.g., my-sandbox"]');
    const dirInput = container.querySelector('input[placeholder="./amplify"]');
    const excludeInput = container.querySelector('input[placeholder="e.g., node_modules,dist"]');

    expect(identifierInput).not.toBeNull();
    expect(dirInput).not.toBeNull();
    expect(excludeInput).not.toBeNull();

    // Set values in the form
    if (identifierInput && dirInput && excludeInput) {
      await userEvent.clear(identifierInput);
      await userEvent.type(identifierInput, "test-sandbox");

      await userEvent.clear(dirInput);
      await userEvent.type(dirInput, "./custom-dir");

      await userEvent.clear(excludeInput);
      await userEvent.type(excludeInput, "node_modules,dist");
    }

    // Find and click the Start Sandbox button
    const startButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('Start Sandbox')
    );

    if (startButton) {
      await userEvent.click(startButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);

      // Check that options are passed correctly
      const options = mockOnConfirm.mock.calls[0][0] as DevToolsSandboxOptions;
      expect(options.identifier).toBe("test-sandbox");
      expect(options.dirToWatch).toBe("./custom-dir");
      expect(options.exclude).toBe("node_modules,dist");
    }
  });
});
