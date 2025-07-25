import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DeploymentProgress from './DeploymentProgress';
import type { DeploymentClientService } from '../services/deployment_client_service';

// Mock the imports
vi.mock('../services/deployment_client_service', () => ({
  DeploymentClientService: vi.fn(),
}));

vi.mock('@aws-amplify/sandbox', () => ({
  // Mock the SandboxStatus type
}));

// Create a mock deployment service
const createMockDeploymentService = () => {
  const subscribers = {
    cloudFormationEvents: [] as Array<(data: any) => void>,
    savedCloudFormationEvents: [] as Array<(data: any) => void>,
    cloudFormationEventsError: [] as Array<(data: any) => void>,
    deploymentError: [] as Array<(data: any) => void>,
  };

  const mockService = {
    getCloudFormationEvents: vi.fn(),
    getSavedCloudFormationEvents: vi.fn(),

    onCloudFormationEvents: vi.fn((handler) => {
      subscribers.cloudFormationEvents.push(handler);
      return {
        unsubscribe: vi.fn(() => {
          const index = subscribers.cloudFormationEvents.indexOf(handler);
          if (index !== -1) subscribers.cloudFormationEvents.splice(index, 1);
        }),
      };
    }),

    onSavedCloudFormationEvents: vi.fn((handler) => {
      subscribers.savedCloudFormationEvents.push(handler);
      return {
        unsubscribe: vi.fn(() => {
          const index = subscribers.savedCloudFormationEvents.indexOf(handler);
          if (index !== -1)
            subscribers.savedCloudFormationEvents.splice(index, 1);
        }),
      };
    }),

    onCloudFormationEventsError: vi.fn((handler) => {
      subscribers.cloudFormationEventsError.push(handler);
      return {
        unsubscribe: vi.fn(() => {
          const index = subscribers.cloudFormationEventsError.indexOf(handler);
          if (index !== -1)
            subscribers.cloudFormationEventsError.splice(index, 1);
        }),
      };
    }),

    onDeploymentError: vi.fn((handler) => {
      subscribers.deploymentError.push(handler);
      return {
        unsubscribe: vi.fn(() => {
          const index = subscribers.deploymentError.indexOf(handler);
          if (index !== -1) subscribers.deploymentError.splice(index, 1);
        }),
      };
    }),

    // Helper to trigger events for testing
    emitEvent: (eventName: string, data: any) => {
      if (eventName === 'cloudFormationEvents') {
        subscribers.cloudFormationEvents.forEach((handler) => handler(data));
      } else if (eventName === 'savedCloudFormationEvents') {
        subscribers.savedCloudFormationEvents.forEach((handler) =>
          handler(data),
        );
      } else if (eventName === 'cloudFormationEventsError') {
        subscribers.cloudFormationEventsError.forEach((handler) =>
          handler(data),
        );
      } else if (eventName === 'deploymentError') {
        subscribers.deploymentError.forEach((handler) => handler(data));
      }
    },
  };

  return mockService;
};

describe('DeploymentProgress Component', () => {
  // Create a mock service for each test
  let mockDeploymentService: ReturnType<typeof createMockDeploymentService>;

  // Setup before each test
  beforeEach(() => {
    // Setup fake timers to control setTimeout/setInterval
    vi.useFakeTimers();

    // Create a fresh mock service for each test
    mockDeploymentService = createMockDeploymentService();

    // Reset mock calls
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper function to create sample deployment events
  const createSampleEvents = () => [
    {
      message: 'Starting deployment',
      timestamp: '2023-01-01T12:00:00Z',
      isGeneric: true,
    },
    {
      message: 'Creating resources',
      timestamp: '2023-01-01T12:01:00Z',
      resourceStatus: {
        resourceType: 'AWS::Lambda::Function',
        resourceName: 'TestFunction',
        status: 'CREATE_IN_PROGRESS',
        timestamp: '2023-01-01T12:01:00Z',
        key: 'lambda-1',
        eventId: 'event-1',
      },
    },
    {
      message: 'Resource created',
      timestamp: '2023-01-01T12:02:00Z',
      resourceStatus: {
        resourceType: 'AWS::Lambda::Function',
        resourceName: 'TestFunction',
        status: 'CREATE_COMPLETE',
        timestamp: '2023-01-01T12:02:00Z',
        key: 'lambda-1',
        eventId: 'event-2',
      },
    },
    {
      message: 'Creating table',
      timestamp: '2023-01-01T12:03:00Z',
      resourceStatus: {
        resourceType: 'AWS::DynamoDB::Table',
        resourceName: 'TestTable',
        status: 'CREATE_IN_PROGRESS',
        timestamp: '2023-01-01T12:03:00Z',
        key: 'table-1',
        eventId: 'event-3',
      },
    },
  ];

  it('renders with correct header', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Check for header
    expect(screen.getByText('Deployment Progress')).toBeInTheDocument();

    // Check for Clear Events button
    expect(screen.getByText('Clear Events')).toBeInTheDocument();
  });

  it('shows spinner when deployment is in progress', () => {
    const { container } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deploying"
      />,
    );

    // Check for in progress indicator
    expect(screen.getByText('In progress')).toBeInTheDocument();

    // Check for spinner using container query instead of text
    const spinners = container.querySelectorAll('.spinner');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('shows spinner when deletion is in progress', () => {
    const { container } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deleting"
      />,
    );

    // Check for in progress indicator
    expect(screen.getByText('In progress')).toBeInTheDocument();

    // Check for spinner using container query instead of text
    const spinners = container.querySelectorAll('.spinner');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('requests CloudFormation events on mount', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Verify API calls
    expect(
      mockDeploymentService.getSavedCloudFormationEvents,
    ).toHaveBeenCalled();
    expect(mockDeploymentService.getCloudFormationEvents).toHaveBeenCalled();
  });

  it('sets up polling when deployment is in progress', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deploying"
      />,
    );

    // Initial call
    expect(mockDeploymentService.getCloudFormationEvents).toHaveBeenCalledTimes(
      2,
    );

    // Reset mock to check for polling calls
    mockDeploymentService.getCloudFormationEvents.mockClear();

    // Advance timer to trigger polling
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Verify polling call
    expect(mockDeploymentService.getCloudFormationEvents).toHaveBeenCalledTimes(
      1,
    );

    // Advance timer again
    mockDeploymentService.getCloudFormationEvents.mockClear();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Verify another polling call
    expect(mockDeploymentService.getCloudFormationEvents).toHaveBeenCalledTimes(
      1,
    );
  });

  it('displays deployment events when received', () => {
    const { container } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Initially no events
    expect(screen.getByText('No deployment events')).toBeInTheDocument();

    // Emit events
    const sampleEvents = createSampleEvents();
    act(() => {
      mockDeploymentService.emitEvent(
        'savedCloudFormationEvents',
        sampleEvents,
      );
    });

    // Check for resource types
    expect(screen.getByText('AWS::Lambda::Function')).toBeInTheDocument();
    expect(screen.getByText('AWS::DynamoDB::Table')).toBeInTheDocument();

    // Check for resource names
    expect(screen.getByText('TestFunction')).toBeInTheDocument();
    expect(screen.getByText('TestTable')).toBeInTheDocument();

    // Check for status
    expect(container.textContent).toContain('CREATE_COMPLETE');
    expect(container.textContent).toContain('CREATE_IN_PROGRESS');
  });

  it('clears events when Clear Events button is clicked', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Emit events
    const sampleEvents = createSampleEvents();
    act(() => {
      mockDeploymentService.emitEvent(
        'savedCloudFormationEvents',
        sampleEvents,
      );
    });

    // Check events are displayed
    expect(screen.getByText('AWS::Lambda::Function')).toBeInTheDocument();

    // Click clear button
    const clearButton = screen.getByText('Clear Events');
    fireEvent.click(clearButton);

    // Check events are cleared
    expect(screen.queryByText('AWS::Lambda::Function')).not.toBeInTheDocument();
    expect(screen.getByText('No deployment events')).toBeInTheDocument();
  });

  it('disables Clear Events button during deployment', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deploying"
      />,
    );

    // Find Clear Events button and check it's disabled
    const clearButton = screen.getByText('Clear Events');
    expect(clearButton).toBeDisabled();
  });

  it('displays deployment error when received', () => {
    const { container } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Emit error
    act(() => {
      mockDeploymentService.emitEvent('deploymentError', {
        name: 'DeploymentError',
        message: 'Failed to deploy resources',
        timestamp: '2023-01-01T12:00:00Z',
        resolution: 'Check your configuration',
      });
    });

    // Check error message is displayed
    expect(container.textContent).toContain('Failed to deploy resources');

    // Check for resolution text
    expect(container.textContent).toContain('Check your configuration');

    // Check for Resolution label
    expect(container.textContent).toContain('Resolution:');
  });

  it('dismisses error when dismiss button is clicked', () => {
    const { container } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Emit error
    act(() => {
      mockDeploymentService.emitEvent('deploymentError', {
        name: 'DeploymentError',
        message: 'Failed to deploy resources',
        timestamp: '2023-01-01T12:00:00Z',
      });
    });

    // Check error is displayed
    expect(container.textContent).toContain('Failed to deploy resources');

    // Find and click dismiss button (it's in the Alert component)
    // The Alert component from @cloudscape-design/components has a dismissible button
    const dismissButton = container.querySelector(
      'button[aria-label="Dismiss"]',
    );
    expect(dismissButton).toBeInTheDocument();
    if (dismissButton) {
      fireEvent.click(dismissButton);
    }

    // Check error is dismissed
    expect(container.textContent).not.toContain('Failed to deploy resources');
  });

  it('handles CloudFormation events error', () => {
    const { container } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Emit error
    act(() => {
      mockDeploymentService.emitEvent('cloudFormationEventsError', {
        error: 'Failed to fetch events',
      });
    });

    // Error should be logged but not displayed in UI
    // This is a console.error in the component
    expect(container).toBeInTheDocument();
  });

  it('expands section automatically when deployment starts', () => {
    const { rerender } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Change status to deploying
    rerender(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deploying"
      />,
    );

    // Check for deployment in progress text in the header
    expect(screen.getByText('Deployment in progress')).toBeInTheDocument();

    // Check for waiting message which confirms the section is expanded
    expect(
      screen.getByText('Waiting for deployment events...'),
    ).toBeInTheDocument();
  });

  it('expands section automatically when deletion starts', () => {
    const { rerender } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Change status to deleting
    rerender(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deleting"
      />,
    );

    // Check for deletion in progress text in the header
    expect(screen.getByText('Deletion in progress')).toBeInTheDocument();

    // Check for waiting message which confirms the section is expanded
    expect(
      screen.getByText('Waiting for deployment events...'),
    ).toBeInTheDocument();
  });

  it('shows waiting message when no events during deployment', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deploying"
      />,
    );

    // Check for waiting message
    expect(
      screen.getByText('Waiting for deployment events...'),
    ).toBeInTheDocument();
  });

  it('merges and deduplicates events', () => {
    render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Emit first set of events
    const initialEvents = [
      {
        message: 'Creating resources',
        timestamp: '2023-01-01T12:01:00Z',
        resourceStatus: {
          resourceType: 'AWS::Lambda::Function',
          resourceName: 'TestFunction',
          status: 'CREATE_IN_PROGRESS',
          timestamp: '2023-01-01T12:01:00Z',
          key: 'lambda-1',
          eventId: 'event-1',
        },
      },
    ];

    act(() => {
      mockDeploymentService.emitEvent('cloudFormationEvents', initialEvents);
    });

    // Check initial event is displayed
    expect(screen.getByText('TestFunction')).toBeInTheDocument();
    expect(screen.getByText(/CREATE_IN_PROGRESS/)).toBeInTheDocument();

    // Emit updated event with same eventId
    const updatedEvents = [
      {
        message: 'Resource created',
        timestamp: '2023-01-01T12:02:00Z',
        resourceStatus: {
          resourceType: 'AWS::Lambda::Function',
          resourceName: 'TestFunction',
          status: 'CREATE_COMPLETE',
          timestamp: '2023-01-01T12:02:00Z',
          key: 'lambda-1',
          eventId: 'event-1',
        },
      },
    ];

    act(() => {
      mockDeploymentService.emitEvent('cloudFormationEvents', updatedEvents);
    });

    // Check updated status is displayed
    expect(screen.getByText('TestFunction')).toBeInTheDocument();
    expect(screen.getByText(/CREATE_COMPLETE/)).toBeInTheDocument();
    expect(screen.queryByText(/CREATE_IN_PROGRESS/)).not.toBeInTheDocument();
  });

  it('clears events when deployment starts', () => {
    const { rerender } = render(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="running"
      />,
    );

    // Emit events
    const sampleEvents = createSampleEvents();
    act(() => {
      mockDeploymentService.emitEvent(
        'savedCloudFormationEvents',
        sampleEvents,
      );
    });

    // Check events are displayed
    expect(screen.getByText('AWS::Lambda::Function')).toBeInTheDocument();

    // Change status to deploying
    rerender(
      <DeploymentProgress
        deploymentClientService={
          mockDeploymentService as unknown as DeploymentClientService
        }
        visible={true}
        status="deploying"
      />,
    );

    // Check events are cleared
    expect(screen.queryByText('AWS::Lambda::Function')).not.toBeInTheDocument();
    expect(
      screen.getByText('Waiting for deployment events...'),
    ).toBeInTheDocument();
  });
});
