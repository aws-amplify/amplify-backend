import React, { useState, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { useResourceManager, Resource } from './ResourceManager';
import { getAwsConsoleUrl, ResourceWithFriendlyName } from '../../../resource_console_functions';
import '@cloudscape-design/global-styles/index.css';
import {
  Button,
  Container,
  Header,
  Spinner,
  Table,
  TextContent,
  Box,
  SpaceBetween,
  ExpandableSection,
  StatusIndicator,
  Link,
  Input,
  FormField,
  Grid,
  Multiselect,
  SelectProps
} from '@cloudscape-design/components';

interface ResourceConsoleProps {
  socket: Socket | null;
}

const ResourceConsole: React.FC<ResourceConsoleProps> = ({ socket }) => {
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const REFRESH_COOLDOWN_MS = 5000; // 5 seconds minimum between refreshes
  
  // Wrap refreshResources with rate limiting
  const { resources, loading, error, refreshResources: originalRefreshResources } = useResourceManager(socket);
  
  const refreshResources = React.useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
      return;
    }
    
    originalRefreshResources();
    setLastRefreshTime(now);
  }, [originalRefreshResources, lastRefreshTime, REFRESH_COOLDOWN_MS]);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<readonly SelectProps.Option[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<readonly SelectProps.Option[]>([]);

  // Extract all unique resource types and statuses for filter options
  const serviceTypeOptions = useMemo(() => {
    if (!resources?.resources) return [];
    
    const types = new Set<string>();
    resources.resources.forEach((resource: Resource) => {
      if (resource.resourceType !== 'AWS::CDK::Metadata') {
        types.add(resource.resourceType);
      }
    });
    
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [resources]);

  const statusOptions = useMemo(() => {
    if (!resources?.resources) return [];
    
    const statuses = new Set<string>();
    resources.resources.forEach((resource: Resource) => {
      statuses.add(resource.resourceStatus);
    });
    
    return Array.from(statuses).map(status => ({ label: status, value: status }));
  }, [resources]);

  // Extract service name from resource type (e.g., "Lambda" from "AWS::Lambda::Function")
  const getServiceName = (resourceType: string): string => {
    const parts = resourceType.split('::');
    return parts.length >= 2 ? parts[1] : resourceType;
  };

  // Get a friendly resource type name without the AWS:: prefix
  const getFriendlyResourceType = (resourceType: string): string => {
    const parts = resourceType.split('::');
    if (parts.length == 3) {
      return `${parts[1]} ${parts[2]}`;
    }
    else if (parts.length > 3) {
      return `${parts[1]} ${parts[2]} ${parts[3]}`;
    }
    return resourceType;
  };

  // Get a friendly name for a resource based on its friendlyName property or logical ID
  const getFriendlyResourceName = (resource: Resource): string => {
    // If the resource has a friendlyName property, use it
    if (resource.friendlyName) {
      return resource.friendlyName;
    }
    // Otherwise, fall back to the logical ID
    return resource.logicalResourceId;
  };

  // Filter resources based on search query and selected filters
  const filteredResources = useMemo(() => {
    if (!resources?.resources) return [];
    
    return resources.resources.filter((resource: Resource) => {
      // Filter out CDK metadata
      if (resource.resourceType === 'AWS::CDK::Metadata') return false;
      
      // Apply search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        resource.logicalResourceId.toLowerCase().includes(searchLower) ||
        resource.physicalResourceId.toLowerCase().includes(searchLower) ||
        getFriendlyResourceName(resource).toLowerCase().includes(searchLower) ||
        resource.resourceType.toLowerCase().includes(searchLower);
      
      const matchesServiceType = selectedServiceTypes.length === 0 || 
        selectedServiceTypes.some(option => option.value === resource.resourceType);
      
      const matchesStatus = selectedStatuses.length === 0 || 
        selectedStatuses.some(option => option.value === resource.resourceStatus);
      
      return matchesSearch && matchesServiceType && matchesStatus;
    });
  }, [resources, searchQuery, selectedServiceTypes, selectedStatuses]);

  // Group filtered resources by service and then by resource type
  const groupedResources = useMemo(() => {
    const serviceGroups: Record<string, Record<string, Resource[]>> = {};
    
    filteredResources.forEach((resource: Resource) => {
      const service = getServiceName(resource.resourceType);
      const resourceType = getFriendlyResourceType(resource.resourceType);
      
      if (!serviceGroups[service]) {
        serviceGroups[service] = {};
      }
      
      if (!serviceGroups[service][resourceType]) {
        serviceGroups[service][resourceType] = [];
      }
      
      serviceGroups[service][resourceType].push(resource);
    });
    
    return serviceGroups;
  }, [filteredResources]);

  const getStatusType = (status: string): 'Deployed' | 'Failed' | 'Deleted' | 'Deleting' | 'Deploying' | 'Unknown' => {
    if (status.includes('DEPLOYED')) return 'Deployed';
    if (status.includes('FAILED')) return 'Failed';
    if (status.includes('DELETED')) return 'Deleted';
    if (status.includes('DELETING')) return 'Deleting';
    if (status.includes('DEPLOYING')) return 'Deploying';
    return 'Unknown'; // Default for unknown status types
  };

  // Get the AWS region from the resources data
  const region = useMemo(() => {
    return resources?.region || null;
  }, [resources]);

  const regionAvailable = region !== null;

  if (loading) {
    return (
      <Container>
        <SpaceBetween direction="vertical" size="m">
          <Box textAlign="center" padding="l">
            <Spinner size="large" />
            <TextContent>
              <p>Loading resources...</p>
            </TextContent>
          </Box>
        </SpaceBetween>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <SpaceBetween direction="vertical" size="m">
          <Box textAlign="center" padding="l">
            <StatusIndicator type="error">Error: {error}</StatusIndicator>
            <Button onClick={refreshResources}>Retry</Button>
          </Box>
        </SpaceBetween>
      </Container>
    );
  }

  if (!resources || Object.keys(groupedResources).length === 0) {
    return (
      <Container>
        <SpaceBetween direction="vertical" size="m">
          <Box textAlign="center" padding="l">
            <TextContent>
              <p>No resources found.</p>
            </TextContent>
            <Button onClick={refreshResources}>Refresh</Button>
          </Box>
        </SpaceBetween>
      </Container>
    );
  }

  // Define consistent column definitions for all tables
  const columnDefinitions = [
    {
      id: 'name',
      header: 'Resource Name',
      cell: (item: Resource) => {
        return getFriendlyResourceName(item);
      },
      width: 600,
      minWidth: 200
    },
    {
      id: 'logicalId',
      header: 'Logical ID',
      cell: (item: Resource) => item.logicalResourceId,
      width: 600,
      minWidth: 200
    },
    {
      id: 'status',
      header: 'Status',
      cell: (item: Resource) => (
        <Box padding="s">
          <SpaceBetween direction="vertical" size="xs">
            {/* <StatusIndicator type={getStatusType(item.resourceStatus)}>
              {item.resourceStatus}
            </StatusIndicator> */}
            <Box color="text-status-info" fontSize="body-m">
              {getStatusType(item.resourceStatus)}
            </Box>
          </SpaceBetween>
        </Box>
      ),
      width: 200,
      minWidth: 200
    },
    {
      id: 'physicalId',
      header: 'Physical ID',
      cell: (item: Resource) => item.physicalResourceId,
      width: 600,
      minWidth: 300
    },
    {
      id: 'console',
      header: 'AWS Console',
      cell: (item: Resource) => {
        const url = getAwsConsoleUrl(item as ResourceWithFriendlyName, region);
        
        return url ? (
          <Link href={url} external>
            View in AWS Console
          </Link>
        ) : (
          <span>Not available</span>
        );
      },
      width: 250,
      minWidth: 250
    }
  ];

  // Empty state for tables
  const emptyState = (
    <Box textAlign="center" padding="s">
      <SpaceBetween direction="vertical" size="xs">
        <TextContent>
          <p>No resources found</p>
        </TextContent>
      </SpaceBetween>
    </Box>
  );

  return (
      <Container
        disableContentPaddings={false}
        variant="default"
        fitHeight
      >
      <SpaceBetween direction="vertical" size="l">
        <Header
          variant="h1"
          actions={
            <Button onClick={refreshResources} iconName="refresh">
              Refresh
            </Button>
          }
        >
          Deployed Resources
        </Header>
        
        {!regionAvailable && (
          <StatusIndicator type="warning">
            AWS region could not be detected. Console links are unavailable.
          </StatusIndicator>
        )}

        <Grid gridDefinition={[{ colspan: 12 }]}>
          <SpaceBetween direction="vertical" size="s">
            <FormField label="Search resources">
              <Input
                value={searchQuery}
                onChange={({ detail }) => setSearchQuery(detail.value)}
                placeholder="Search by ID, type, or status..."
              />
            </FormField>
            
            <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
              <FormField label="Filter by service type">
                <Multiselect
                  selectedOptions={selectedServiceTypes}
                  onChange={({ detail }) => setSelectedServiceTypes(detail.selectedOptions)}
                  options={serviceTypeOptions}
                  placeholder="Select service types"
                  filteringType="auto"
                />
              </FormField>
              
              <FormField label="Filter by deployment status">
                <Multiselect
                  selectedOptions={selectedStatuses}
                  onChange={({ detail }) => setSelectedStatuses(detail.selectedOptions)}
                  options={statusOptions}
                  placeholder="Select statuses"
                  filteringType="auto"
                />
              </FormField>
            </Grid>
          </SpaceBetween>
        </Grid>
        
        {Object.entries(groupedResources).map(([serviceName, resourceTypes]) => (
          <ExpandableSection 
            key={serviceName} 
            headerText={serviceName}
            defaultExpanded
          >
            <SpaceBetween direction="vertical" size="s">
              {Object.entries(resourceTypes).map(([resourceType, resources]) => (
                <ExpandableSection 
                  key={`${serviceName}-${resourceType}`} 
                  headerText={resourceType}
                  variant="container"
                >
                  <Table
                    columnDefinitions={columnDefinitions}
                    items={resources}
                    loadingText="Loading resources"
                    trackBy="logicalResourceId"
                    empty={emptyState}
                    resizableColumns
                    stickyHeader
                    wrapLines
                  />
                </ExpandableSection>
              ))}
            </SpaceBetween>
          </ExpandableSection>
        ))}
      </SpaceBetween>
    </Container>
  );
};

export default ResourceConsole;
