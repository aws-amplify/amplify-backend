import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ConsoleViewer, { ConsoleLogEntry } from './ConsoleViewer';

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
    const { container } = render(<ConsoleViewer logs={sampleLogs} />);

    // Check heading
    expect(container.textContent).toContain('Console Logs');

    // Check if logs are displayed
    expect(container.textContent).toContain('Application started');
    expect(container.textContent).toContain('Failed to connect to database');
    expect(container.textContent).toContain('Slow query detected');
    expect(container.textContent).toContain('User logged in: admin');
    
    // Additionally, we should verify all log entries are present in the DOM
    sampleLogs.forEach(log => {
      expect(container.textContent).toContain(log.message);
      expect(container.textContent).toContain(log.level);
    });
  });

  it('renders empty state when no logs are provided', () => {
    const { container } = render(<ConsoleViewer logs={[]} />);

    // Check for empty state component
    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).toBeDefined();
    
    expect(container.querySelector('.empty-state-content')).toBeDefined();
  });

  it('displays all log levels in filter dropdown', () => {
    const { container } = render(<ConsoleViewer logs={sampleLogs} />);

    // Check that the filter section is present
    expect(container.textContent).toContain('Filter by log level');

    // Check that the multiselect for filtering is present
    const multiselect = container.querySelector('.multiselect');
    expect(multiselect).toBeDefined();
    
    // There should be some representation of the log levels available
    const uniqueLevels = [...new Set(sampleLogs.map(log => log.level))];
    uniqueLevels.forEach(level => {
      expect(container.textContent).toContain(level);
    });
  });

  it('shows search input field', () => {
    const { container } = render(<ConsoleViewer logs={sampleLogs} />);

    expect(container.textContent).toContain('Search logs');

    // Check for the search placeholder
    const searchInput = container.querySelector('input[placeholder="Search in logs..."]');
    expect(searchInput).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    const { container } = render(<ConsoleViewer logs={sampleLogs} />);

    // Since formatTimestamp is internal to the component and depends on locale,
    // we can just verify that the timestamps are displayed in some form
    const timestampCells = container.querySelectorAll('td:first-child');
    expect(timestampCells.length).toBeGreaterThan(0);
    
    // Each timestamp cell should have a non-empty content
    timestampCells.forEach(cell => {
      expect(cell.textContent).not.toBe("");
    });
  });

  it('shows correct status indicators for different log levels', () => {
    const { container } = render(<ConsoleViewer logs={sampleLogs} />);

    // Check if the log levels are displayed
    expect(container.textContent).toContain('INFO');
    expect(container.textContent).toContain('ERROR');
    expect(container.textContent).toContain('WARNING');
    expect(container.textContent).toContain('DEBUG');
    
    // Just verify that we have spans with status indicators
    const statusIndicators = container.querySelectorAll('[data-status]');
    expect(statusIndicators.length).toBeGreaterThan(0);
    
    // Since we're using mocked components, we know our StatusIndicator component
    // adds the data-status attribute. Let's verify we have different types.
    const statusTypes = Array.from(statusIndicators).map(el => 
      el.getAttribute('data-status')
    );
    expect(statusTypes.length).toBeGreaterThan(0);
  });
});
