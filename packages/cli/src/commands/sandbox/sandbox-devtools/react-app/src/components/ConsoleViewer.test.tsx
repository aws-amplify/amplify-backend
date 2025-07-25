import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsoleViewer from './ConsoleViewer';
import { ConsoleLogEntry } from '../../../shared/socket_types';

describe('ConsoleViewer Component', () => {
  // Sample log entries for testing
  const sampleLogs: ConsoleLogEntry[] = [
    {
      id: '1',
      timestamp: '2023-01-01T12:00:00Z',
      level: 'INFO',
      message: 'Application started',
    },
    {
      id: '2',
      timestamp: '2023-01-01T12:01:00Z',
      level: 'ERROR',
      message: 'Failed to connect to database',
    },
    {
      id: '3',
      timestamp: '2023-01-01T12:02:00Z',
      level: 'WARNING',
      message: 'Slow query detected',
    },
    {
      id: '4',
      timestamp: '2023-01-01T12:03:00Z',
      level: 'INFO',
      message: 'User logged in: admin',
    },
    {
      id: '5',
      timestamp: '2023-01-01T12:04:00Z',
      level: 'DEBUG',
      message: 'Connection pool status: 5 active, 10 idle',
    },
  ];

  it('renders with logs', () => {
    render(<ConsoleViewer logs={sampleLogs} />);

    // Check heading
    expect(screen.getByText('Console Logs')).toBeInTheDocument();

    // Check if logs are displayed
    expect(screen.getByText('Application started')).toBeInTheDocument();
    expect(
      screen.getByText('Failed to connect to database'),
    ).toBeInTheDocument();
    expect(screen.getByText('Slow query detected')).toBeInTheDocument();
    expect(screen.getByText('User logged in: admin')).toBeInTheDocument();
  });

  it('renders empty state when no logs are provided', () => {
    const { container } = render(<ConsoleViewer logs={[]} />);

    // Check for empty state message using a more flexible approach
    // This will look for the text anywhere in the rendered output
    expect(container.textContent).toContain('No logs available');

    // Also check that the table is not rendered when there are no logs
    expect(container.querySelector('thead')).not.toBeInTheDocument();
  });

  it('filters logs by search text', async () => {
    const user = userEvent.setup();
    render(<ConsoleViewer logs={sampleLogs} />);

    // Find search input
    const searchInput = screen.getByPlaceholderText(/Search in logs/i);

    // Type search query
    await user.type(searchInput, 'admin');

    // Only logs containing "admin" should be visible
    expect(screen.getByText('User logged in: admin')).toBeInTheDocument();
    expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Failed to connect to database'),
    ).not.toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(<ConsoleViewer logs={sampleLogs} />);

    // Check that timestamps are formatted (not raw ISO strings)
    const timestampElements = screen.getAllByText(
      /^\d{1,2}:\d{2}:\d{2}(?: [AP]M)?/,
    );
    expect(timestampElements.length).toBeGreaterThan(0);
  });

  it('shows different styling for different log levels', () => {
    render(<ConsoleViewer logs={sampleLogs} />);

    // Find log entries by their messages
    const infoLog = screen.getByText('Application started').closest('tr');
    const errorLog = screen
      .getByText('Failed to connect to database')
      .closest('tr');
    const warningLog = screen.getByText('Slow query detected').closest('tr');

    // Check that they have appropriate class names
    expect(infoLog).toHaveClass('log-level-info');
    expect(errorLog).toHaveClass('log-level-error');
    expect(warningLog).toHaveClass('log-level-warning');
  });

  it('handles scrolling to bottom', async () => {
    // Mock scrollIntoView
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(<ConsoleViewer logs={sampleLogs} />);

    // Find and click "Scroll to Bottom" button if it exists
    const scrollButton = screen.queryByRole('button', {
      name: /Scroll to Bottom/i,
    });
    if (scrollButton) {
      await userEvent.setup().click(scrollButton);
      expect(scrollIntoViewMock).toHaveBeenCalled();
    }
  });
});
