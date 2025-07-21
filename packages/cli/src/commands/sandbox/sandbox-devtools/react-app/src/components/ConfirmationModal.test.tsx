import { describe, it, beforeEach, vi, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal Component', () => {
  const mockOnCancel = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnCancel.mockReset();
    mockOnConfirm.mockReset();
  });

  it('should not render when visible is false', () => {
    const { container } = render(
      <ConfirmationModal
        visible={false}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test content"
        confirmButtonText="Confirm"
        cancelButtonText="Cancel"
      />,
    );

    // Check if modal content is not in the document
    expect(container.textContent?.includes('Test Title')).toBe(false);
  });

  it('should render when visible is true', () => {
    render(
      <ConfirmationModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test content"
        confirmButtonText="Confirm"
        cancelButtonText="Cancel"
      />,
    );

    // We should check for modal content in the document
    expect(document.body.textContent?.includes('Test Title')).toBe(true);
    expect(document.body.textContent?.includes('Test content')).toBe(true);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(
      <ConfirmationModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test content"
        confirmButtonText="Confirm"
        cancelButtonText="Cancel"
      />,
    );

    // Find and click the cancel button
    const cancelButton = document.querySelector('button');
    expect(cancelButton).not.toBeNull();

    if (cancelButton) {
      await userEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    }
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    render(
      <ConfirmationModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test content"
        confirmButtonText="Confirm"
        cancelButtonText="Cancel"
      />,
    );

    // Find and click the confirm button - it's the primary button
    const confirmButton = document.querySelector(
      'button[data-variant="primary"]',
    );
    expect(confirmButton).not.toBeNull();

    if (confirmButton) {
      await userEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    }
  });
});
