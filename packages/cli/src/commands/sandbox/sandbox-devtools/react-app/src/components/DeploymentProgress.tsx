import React, { useState, useEffect, useRef } from 'react';
import { DeploymentClientService } from '../services/deployment_client_service';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Spinner,
  ExpandableSection,
  Alert,
} from '@cloudscape-design/components';
import { SandboxStatus } from '@aws-amplify/sandbox';

interface DeploymentProgressProps {
  deploymentClientService: DeploymentClientService;
  visible: boolean;
  status: SandboxStatus;
}

interface ErrorState {
  hasError: boolean;
  name: string;
  message: string;
  resolution?: string;
  timestamp: string;
}

interface ResourceStatus {
  resourceType: string;
  resourceName: string;
  status: string;
  timestamp: string;
  key: string;
  statusReason?: string;
  eventId?: string;
}

interface DeploymentEvent {
  message: string;
  timestamp: string;
  resourceStatus?: ResourceStatus;
  isGeneric?: boolean;
}

const DeploymentProgress: React.FC<DeploymentProgressProps> = ({
  deploymentClientService,
  visible,
  status,
}) => {
  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [resourceStatuses, setResourceStatuses] = useState<
    Record<string, ResourceStatus>
  >({});
  const [deploymentStartTime, setDeploymentStartTime] = useState<Date | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    name: '',
    message: '',
    timestamp: '',
  });

  const [expanded, setExpanded] = useState<boolean>(
    status === 'deploying' || status === 'deleting',
  );

  // Update expanded state when deployment or deletion status changes
  useEffect(() => {
    if (status === 'deploying' || status === 'deleting') {
      setExpanded(true);
    } else if (
      status === 'running' ||
      status === 'stopped' ||
      status === 'nonexistent'
    ) {
      // Close the expandable section when the operation is no longer in progress
      setExpanded(false);
    }
  }, [status]);

  const getSpinnerStatus = (status: string): boolean => {
    return status.includes('IN_PROGRESS');
  };

  // Helper function to determine if a status is more recent/important
  const isMoreRecentStatus = (
    newEvent: DeploymentEvent,
    existingEvent: DeploymentEvent,
  ): boolean => {
    if (!newEvent.resourceStatus || !existingEvent.resourceStatus) return false;

    // First check timestamp - newer events take priority
    const newTime = new Date(newEvent.timestamp).getTime();
    const existingTime = new Date(existingEvent.timestamp).getTime();

    return newTime > existingTime;
  };

  // Helper function to merge and deduplicate events
  const mergeEvents = (
    existingEvents: DeploymentEvent[],
    newEvents: DeploymentEvent[],
  ): DeploymentEvent[] => {
    const eventMap = new Map<string, DeploymentEvent>();

    // Add existing events
    existingEvents.forEach((event) => {
      const key =
        event.resourceStatus?.eventId || `${event.timestamp}-${event.message}`;
      eventMap.set(key, event);
    });

    // Add new events (will overwrite duplicates)
    newEvents.forEach((event) => {
      const key =
        event.resourceStatus?.eventId || `${event.timestamp}-${event.message}`;
      eventMap.set(key, event);
    });

    return Array.from(eventMap.values());
  };

  // Helper function to get latest status for each resource
  const getLatestResourceStatuses = (
    events: DeploymentEvent[],
  ): Record<string, ResourceStatus> => {
    const resourceMap = new Map<string, DeploymentEvent>();

    events.forEach((event) => {
      if (event.resourceStatus) {
        const existing = resourceMap.get(event.resourceStatus.key);
        if (!existing || isMoreRecentStatus(event, existing)) {
          resourceMap.set(event.resourceStatus.key, event);
        }
      }
    });

    const result: Record<string, ResourceStatus> = {};
    resourceMap.forEach((event, key) => {
      if (event.resourceStatus) {
        result[key] = event.resourceStatus;
      }
    });

    return result;
  };

  useEffect(() => {
    const unsubscribeDeploymentError =
      deploymentClientService.onDeploymentError((error) => {
        setErrorState({
          hasError: true,
          name: error.name,
          message: error.message,
          resolution: error.resolution,
          timestamp: error.timestamp,
        });
      });

    return () => {
      unsubscribeDeploymentError.unsubscribe();
    };
  }, [deploymentClientService]);

  // Set up stable event listeners
  useEffect(() => {
    // Handle saved CloudFormation events
    const handleSavedCloudFormationEvents = (
      savedEvents: DeploymentEvent[],
    ) => {
      console.log('Received saved CloudFormation events:', savedEvents.length);

      // Don't process saved events during deployment OR deletion
      if (status !== 'deploying' && status !== 'deleting') {
        // Sort events by timestamp (newest first)
        const sortedEvents = savedEvents.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        // Get latest status for each resource
        const latestResourceStatuses = getLatestResourceStatuses(sortedEvents);

        // Update state
        setEvents(sortedEvents);
        setResourceStatuses(latestResourceStatuses);
      } else {
        console.log(
          'Ignoring saved CloudFormation events because deployment or deletion is in progress',
        );
      }
    };

    // Handle CloudFormation events from the API
    const handleCloudFormationEvents = (cfnEvents: DeploymentEvent[]) => {
      console.log(
        `Received ${cfnEvents.length} CloudFormation events, current status: ${status}`,
      );

      if (cfnEvents.length === 0) {
        console.log('No CloudFormation events received, returning early');
        return;
      }

      // Filter events based on deployment start time during active deployment
      let filteredEvents = cfnEvents;
      if (
        (status === 'deploying' || status === 'deleting') &&
        deploymentStartTime
      ) {
        filteredEvents = cfnEvents.filter((event) => {
          const eventTime = new Date(event.timestamp);
          return eventTime >= deploymentStartTime;
        });
        console.log(
          `Filtered events from ${cfnEvents.length} to ${filteredEvents.length} (since deployment start)`,
        );
      }

      // Merge with existing events and deduplicate
      const mergedEvents = mergeEvents(events, filteredEvents);

      // Sort events by timestamp (newest first)
      const sortedEvents = mergedEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Get latest status for each resource
      const latestResourceStatuses = getLatestResourceStatuses(sortedEvents);

      // Update state
      setEvents(sortedEvents);
      setResourceStatuses(latestResourceStatuses);
    };

    // Handle CloudFormation events error
    const handleCloudFormationEventsError = (error: { error: string }) => {
      console.error('Error fetching CloudFormation events:', error.error);
    };

    const unsubscribeCloudFormationEvents =
      deploymentClientService.onCloudFormationEvents(
        handleCloudFormationEvents,
      );
    const unsubscribeCloudFormationEventsError =
      deploymentClientService.onCloudFormationEventsError(
        handleCloudFormationEventsError,
      );
    const unsubscribeSavedCloudFormationEvents =
      deploymentClientService.onSavedCloudFormationEvents(
        handleSavedCloudFormationEvents,
      );

    return () => {
      unsubscribeCloudFormationEvents.unsubscribe();
      unsubscribeCloudFormationEventsError.unsubscribe();
      unsubscribeSavedCloudFormationEvents.unsubscribe();
    };
  }, [deploymentClientService, status, deploymentStartTime, events]);

  // Separate useEffect for requesting events and polling
  useEffect(() => {
    if (status === 'deploying' || status === 'deleting') {
      // Record deployment start time and clear previous events
      setDeploymentStartTime(new Date());
      setEvents([]);
      setResourceStatuses({});
      setErrorState({
        hasError: false,
        name: '',
        message: '',
        timestamp: '',
      });

      // Only request CloudFormation events directly from the API during deployment
      console.log(
        `DeploymentProgress: Requesting CloudFormation events, status: ${status}`,
      );
      deploymentClientService.getCloudFormationEvents();
    } else {
      // Only request saved CloudFormation events when not deploying or deleting
      console.log('DeploymentProgress: Requesting saved CloudFormation events');
      deploymentClientService.getSavedCloudFormationEvents();

      // Also request current CloudFormation events for non-deployment states
      console.log(
        `DeploymentProgress: Requesting CloudFormation events, status: ${status}`,
      );
      deploymentClientService.getCloudFormationEvents();
    }

    // Set up polling for CloudFormation events during deployment or deletion
    let cfnEventsInterval: NodeJS.Timeout | null = null;
    if (status === 'deploying' || status === 'deleting') {
      console.log(
        `Setting up polling for CloudFormation events (${status} state)`,
      );
      cfnEventsInterval = setInterval(() => {
        console.log(`Polling for CloudFormation events, status: ${status}`);
        deploymentClientService.getCloudFormationEvents();
      }, 5000);
    }

    return () => {
      if (cfnEventsInterval) {
        console.log(`Clearing CloudFormation events polling interval`);
        clearInterval(cfnEventsInterval);
      }
    };
  }, [deploymentClientService, status]);

  // Auto-scroll to bottom when events change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  // Clear events
  const clearEvents = () => {
    setEvents([]);
    setResourceStatuses({});
  };

  const showContent = visible || events.length > 0;

  // Group resources by type for better organization
  const resourcesByType: Record<string, ResourceStatus[]> = {};
  Object.values(resourceStatuses).forEach((resource) => {
    if (!resourcesByType[resource.resourceType]) {
      resourcesByType[resource.resourceType] = [];
    }
    resourcesByType[resource.resourceType].push(resource);
  });

  // Sort resource types
  const sortedResourceTypes = Object.keys(resourcesByType).sort();

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button onClick={clearEvents} disabled={status === 'deploying'}>
              Clear Events
            </Button>
          }
        >
          Deployment Progress
          {(status === 'deploying' || status === 'deleting') && (
            <span
              style={{
                marginLeft: '8px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Spinner size="normal" />
              <span style={{ marginLeft: '4px' }}>In progress</span>
            </span>
          )}
        </Header>
      }
    >
      {errorState.hasError && (
        <Alert
          type="error"
          header={errorState.name || 'Error'}
          dismissible
          data-testid="error-alert"
          data-error-name={errorState.name}
          onDismiss={() =>
            setErrorState({
              hasError: false,
              name: '',
              message: '',
              timestamp: '',
            })
          }
        >
          <div>
            <div style={{ marginBottom: '10px' }}>{errorState.message}</div>

            {errorState.resolution && (
              <div style={{ marginTop: '10px' }}>
                <strong>Resolution:</strong> {errorState.resolution}
              </div>
            )}
          </div>
        </Alert>
      )}

      <ExpandableSection
        headerText={
          status === 'deploying'
            ? 'Deployment in progress'
            : status === 'deleting'
              ? 'Deletion in progress'
              : 'Deployment history'
        }
        expanded={expanded}
        onChange={({ detail }) => setExpanded(detail.expanded)}
        headerCounter={
          events.length > 0 ? `${events.length} events` : undefined
        }
        headerDescription={
          status === 'deploying'
            ? 'Deployment is currently running'
            : status === 'deleting'
              ? 'Deletion is currently running'
              : events.length > 0
                ? 'Previous deployment events'
                : 'No deployment events'
        }
      >
        {showContent && (
          <div
            ref={containerRef}
            data-testid="deployment-events-container"
            style={{
              overflow: 'auto',
              maxHeight: '500px',
              backgroundColor: '#1a1a1a',
              color: '#f0f0f0',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #333',
            }}
          >
            {events.length === 0 ? (
              <Box textAlign="center" padding="m" color="inherit">
                <SpaceBetween size="m">
                  {status === 'deploying' || status === 'deleting' ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <Spinner />
                        <span>
                          <span>Waiting for deployment events...</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div>No deployment events</div>
                  )}
                </SpaceBetween>
              </Box>
            ) : (
              <div>
                {/* Group resources by type */}
                {sortedResourceTypes.map((resourceType) => (
                  <div key={resourceType} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        color: '#4db6ac',
                        borderBottom: '1px solid #333',
                        paddingBottom: '4px',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                      }}
                    >
                      {resourceType}
                    </div>

                    {resourcesByType[resourceType].map((resource) => (
                      <div
                        key={resource.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px 0',
                          marginLeft: '16px',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            marginRight: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getSpinnerStatus(resource.status) ? (
                            <div
                              className="spinner"
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                border: '2px solid #4db6ac',
                                borderTopColor: 'transparent',
                                animation: 'spin 1s linear infinite',
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                color: resource.status.includes('COMPLETE')
                                  ? '#4caf50'
                                  : resource.status.includes('FAILED')
                                    ? '#f44336'
                                    : resource.status.includes('DELETE')
                                      ? '#ff9800'
                                      : '#2196f3',
                              }}
                            >
                              {resource.status.includes('COMPLETE')
                                ? '✓'
                                : resource.status.includes('FAILED')
                                  ? '✗'
                                  : resource.status.includes('DELETE')
                                    ? '!'
                                    : '•'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div style={{ color: '#f0f0f0' }}>
                            {resource.resourceName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
                            {resource.status} • {resource.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Show generic events at the bottom */}
                {events.filter((event) => event.isGeneric).length > 0 && (
                  <div
                    style={{
                      marginTop: '16px',
                      borderTop: '1px solid #444',
                      paddingTop: '16px',
                    }}
                  >
                    {events
                      .filter((event) => event.isGeneric)
                      .map((event, index) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {(status === 'deploying' || status === 'deleting') &&
                          index ===
                            events.filter((e) => e.isGeneric).length - 1 ? (
                            <div
                              className="spinner"
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                border: '2px solid #4db6ac',
                                borderTopColor: 'transparent',
                                animation: 'spin 1s linear infinite',
                                marginRight: '8px',
                              }}
                            />
                          ) : (
                            <span
                              style={{ marginRight: '8px', color: '#9e9e9e' }}
                            >
                              •
                            </span>
                          )}
                          <span>{event.message}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ExpandableSection>

      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </Container>
  );
};

export default DeploymentProgress;
