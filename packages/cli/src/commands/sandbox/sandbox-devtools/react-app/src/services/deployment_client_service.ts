import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { SocketClientService } from './socket_client_service';

export interface DeploymentEvent {
  message: string;
  timestamp: string;
  resourceStatus?: ResourceStatus;
  isGeneric?: boolean;
}

export interface ResourceStatus {
  resourceType: string;
  resourceName: string;
  status: string;
  timestamp: string;
  key: string;
  statusReason?: string;
  eventId?: string;
}

export interface DeploymentError {
  name: string;
  message: string;
  resolution?: string;
  timestamp: string;
}

export class DeploymentClientService extends SocketClientService {
  public getCloudFormationEvents(): void {
    this.emit(SOCKET_EVENTS.GET_CLOUD_FORMATION_EVENTS);
  }

  public getSavedCloudFormationEvents(): void {
    this.emit(SOCKET_EVENTS.GET_SAVED_CLOUD_FORMATION_EVENTS);
  }

  public onCloudFormationEvents(handler: (events: DeploymentEvent[]) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS, handler);
  }

  public onSavedCloudFormationEvents(
    handler: (events: DeploymentEvent[]) => void,
  ): { unsubscribe: () => void } {
    return this.on(SOCKET_EVENTS.SAVED_CLOUD_FORMATION_EVENTS, handler);
  }

  public onCloudFormationEventsError(
    handler: (error: { error: string }) => void,
  ): { unsubscribe: () => void } {
    return this.on(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS_ERROR, handler);
  }

  public onDeploymentError(handler: (error: DeploymentError) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.DEPLOYMENT_ERROR, handler);
  }
}
