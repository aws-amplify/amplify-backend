import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResourceConsole from './ResourceConsole';

// Mock modules before imports are used
vi.mock('../hooks/useResourceManager', () => ({
  useResourceManager: vi.fn()
}));

vi.mock('../contexts/socket_client_context', () => ({
  useResourceClientService: vi.fn(() => ({
    getCustomFriendlyNames: vi.fn(),
    viewResourceLogs: vi.fn()
  })),
  useLoggingClientService: vi.fn(() => ({
    viewResourceLogs: vi.fn()
  }))
}));

// Import the mocked module
import { useResourceManager } from '../hooks/useResourceManager';

describe('ResourceConsole Component', () => {
  // Create a base mock that can be reused and extended for different tests
  const createBaseMock = (overrides = {}) => ({
    resources: [
      { 
        logicalResourceId: 'TestFunction',
        physicalResourceId: 'lambda1',
        resourceType: 'AWS::Lambda::Function',
        resourceStatus: 'CREATE_COMPLETE',
        logGroupName: '/aws/lambda/test-function',
        consoleUrl: 'https://console.aws.amazon.com/lambda/home#/functions/lambda1'
      },
      {
        logicalResourceId: 'TestTable',
        physicalResourceId: 'dynamo1',
        resourceType: 'AWS::DynamoDB::Table',
        resourceStatus: 'CREATE_COMPLETE',
        consoleUrl: 'https://console.aws.amazon.com/dynamodb/home#tables:/'
      }
    ],
    isLoading: false,
    error: null,
    region: 'us-east-1',
    customFriendlyNames: {}, 
    backendName: 'test-backend',
    activeLogStreams: [], 
    updateCustomFriendlyName: vi.fn(),
    removeCustomFriendlyName: vi.fn(),
    getResourceDisplayName: vi.fn(resource => resource.logicalResourceId),
    toggleResourceLogging: vi.fn(),
    isLoggingActiveForResource: vi.fn(() => false),
    refreshResources: vi.fn(),
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the hook mock with the base configuration
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock());
  });

  it('renders resources when sandbox is running', () => {
    const { getByText, getAllByText } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Check for title and resource details using testing-library queries
    expect(getByText('Deployed Resources')).toBeInTheDocument();
    
    // Use getAllByText to handle multiple elements with the same text
    const testFunctionElements = getAllByText('TestFunction');
    expect(testFunctionElements.length).toBeGreaterThan(0);
    
    const testTableElements = getAllByText('TestTable');
    expect(testTableElements.length).toBeGreaterThan(0);
  });

  it('shows deploying state when sandbox is deploying', () => {
    const { getByText } = render(<ResourceConsole sandboxStatus="deploying" />);
    
    expect(getByText('Sandbox is deploying')).toBeInTheDocument();
    expect(getByText(/The sandbox is currently being deployed/)).toBeInTheDocument();
  });

  it('shows nonexistent state when sandbox does not exist', () => {
    const { getByText } = render(<ResourceConsole sandboxStatus="nonexistent" />);
    
    expect(getByText('No sandbox exists')).toBeInTheDocument();
    expect(getByText(/You need to create a sandbox first/)).toBeInTheDocument();
  });

  it('shows stopped state when sandbox is stopped', () => {
    const { getByText } = render(<ResourceConsole sandboxStatus="stopped" />);
    
    expect(getByText('Sandbox is stopped')).toBeInTheDocument();
    expect(getByText(/The sandbox is currently stopped/)).toBeInTheDocument();
  });

  it('refreshes resources when refresh button is clicked', async () => {
    // Create a mock with a specific refreshResources function we can track
    const mockRefresh = vi.fn();
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock({
      refreshResources: mockRefresh
    }));
    
    const { getByRole } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Find and click the refresh button using accessible roles
    const refreshButton = getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);
    
    // Verify the refresh function was called
    expect(mockRefresh).toHaveBeenCalled();
  });
  
  it('allows filtering resources by search query', async () => {
    const { getByPlaceholderText } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Find the search input using placeholder text
    const searchInput = getByPlaceholderText('Search by ID, type, or status...');
    
    // Type a search query
    await userEvent.type(searchInput, 'DynamoDB');
    
    // Verify the input value
    expect(searchInput).toHaveValue('DynamoDB');
  });

  it('shows error state when there is an error', () => {
    // Use the createBaseMock helper with overrides for error state
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock({
      resources: [],
      error: 'Failed to load resources'
    }));

    const { getByText, getByRole } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Check for error message
    expect(getByText(/Failed to load resources/)).toBeInTheDocument();
    
    // Check for retry button
    const retryButton = getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('shows empty state when there are no resources', () => {
    // Use the createBaseMock helper with empty resources
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock({
      resources: []
    }));

    const { getByText } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Check for empty state message - use a more specific selector
    expect(getByText('No resources found.')).toBeInTheDocument();
  });

  it('shows loading state when resources are being loaded', () => {
    // Use the createBaseMock helper with loading state
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock({
      resources: [],
      isLoading: true
    }));

    const { getByText } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Check for loading message - use a more specific selector
    expect(getByText('Loading resources...')).toBeInTheDocument();
  });

  it('opens edit modal and completes the editing workflow', async () => {
    // Setup a mock for the update function
    const mockUpdateFriendlyName = vi.fn();
    
    // Set up the hook mock with custom update function
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock({
      updateCustomFriendlyName: mockUpdateFriendlyName
    }));

    const { getAllByLabelText, getByText, getByRole, getAllByText, getByDisplayValue } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Find and click the first edit button
    const editButtons = getAllByLabelText('Edit friendly name');
    await userEvent.click(editButtons[0]);
    
    // Verify modal appears with correct content
    expect(getByText('Edit Resource Name')).toBeInTheDocument();
    expect(getByText('Resource ID')).toBeInTheDocument();
    
    // Use getAllByText to handle multiple elements with the same text
    const resourceIdElements = getAllByText('lambda1');
    expect(resourceIdElements.length).toBeGreaterThan(0);
    
    // Find the input by its current value instead of label
    const nameInput = getByDisplayValue('TestFunction');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'My Custom Function');
    
    // Submit the form
    const saveButton = getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);
    
    // Verify the update function was called with correct parameters
    expect(mockUpdateFriendlyName).toHaveBeenCalledWith('lambda1', 'My Custom Function');
  });

  it('toggles resource logging when log button is clicked', async () => {
    // Setup mocks for logging functions
    const mockToggleLogging = vi.fn();
    const mockIsLoggingActive = vi.fn().mockReturnValue(false);
    
    // Set up the hook mock with logging functions
    vi.mocked(useResourceManager).mockReturnValue(createBaseMock({
      toggleResourceLogging: mockToggleLogging,
      isLoggingActiveForResource: mockIsLoggingActive
    }));

    const { getByText } = render(<ResourceConsole sandboxStatus="running" />);
    
    // Find and click the start logs button
    const logButton = getByText('Start Logs');
    await userEvent.click(logButton);
    
    // Verify the toggle function was called with expected parameters
    expect(mockToggleLogging).toHaveBeenCalledWith(
      expect.objectContaining({ 
        physicalResourceId: 'lambda1',
        resourceType: 'AWS::Lambda::Function'
      }),
      true // Start logging
    );
  });
});
