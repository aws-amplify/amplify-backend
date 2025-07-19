import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LogSettingsModal, { LogSettings } from './LogSettingsModal';

describe('LogSettingsModal Component', () => {
  const mockOnDismiss = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnClear = vi.fn();
  
  const defaultSettings: LogSettings = {
    maxLogSizeMB: 100
  };
  
  beforeEach(() => {
    mockOnDismiss.mockReset();
    mockOnSave.mockReset();
    mockOnClear.mockReset();
  });
  
  it('does not render when visible is false', () => {
    render(
      <LogSettingsModal
        visible={false}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Modal should not be visible
    expect(screen.queryByText('Log Settings')).not.toBeInTheDocument();
  });
  
  it('renders when visible is true', () => {
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Check for modal title
    expect(screen.getByText('Log Settings')).toBeInTheDocument();
    
    // Check for slider label
    expect(screen.getByText(/Maximum Log Size/)).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByText('Clear Logs')).toBeInTheDocument();
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
  
  it('displays current log size when provided', () => {
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
        currentSizeMB={42.5}
      />
    );
    
    // Check for current size display
    expect(screen.getByText('Current log size:')).toBeInTheDocument();
    expect(screen.getByText('42.50 MB')).toBeInTheDocument();
  });
  
  it('calls onDismiss when Cancel button is clicked', () => {
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Find and click the Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Verify onDismiss was called
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });
  
  it('calls onSave with updated settings when Save Settings button is clicked', () => {
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Find and click the Save Settings button
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    // Verify onSave was called with the correct settings
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({ maxLogSizeMB: 100 });
  });
  
  it('calls onClear when Clear Logs button is clicked', () => {
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Find and click the Clear Logs button
    const clearButton = screen.getByText('Clear Logs');
    fireEvent.click(clearButton);
    
    // Verify onClear was called
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
  
  it('updates slider value when changed', () => {
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Find the slider
    const slider = screen.getByTestId('log-size-slider');
    
    // Change the slider value
    fireEvent.change(slider, { target: { value: '200' } });
    
    // Check that the label updates
    expect(screen.getByText(/Maximum Log Size \(200 MB\)/)).toBeInTheDocument();
    
    // Save the settings
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    // Verify onSave was called with updated value
    expect(mockOnSave).toHaveBeenCalledWith({ maxLogSizeMB: 200 });
  });
  
  it('initializes with provided settings', () => {
    const customSettings: LogSettings = {
      maxLogSizeMB: 250
    };
    
    render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={customSettings}
      />
    );
    
    // Check that the label shows the custom value
    expect(screen.getByText(/Maximum Log Size \(250 MB\)/)).toBeInTheDocument();
    
    // Save without changes
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    // Verify onSave was called with the custom settings
    expect(mockOnSave).toHaveBeenCalledWith({ maxLogSizeMB: 250 });
  });
  
  it('updates settings when initialSettings prop changes', () => {
    const { rerender } = render(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={defaultSettings}
      />
    );
    
    // Check initial value
    expect(screen.getByText(/Maximum Log Size \(100 MB\)/)).toBeInTheDocument();
    
    // Update props
    const newSettings: LogSettings = {
      maxLogSizeMB: 300
    };
    
    rerender(
      <LogSettingsModal
        visible={true}
        onDismiss={mockOnDismiss}
        onSave={mockOnSave}
        onClear={mockOnClear}
        initialSettings={newSettings}
      />
    );
    
    // Check that the label updates
    expect(screen.getByText(/Maximum Log Size \(300 MB\)/)).toBeInTheDocument();
  });
});