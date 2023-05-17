import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Functional interface for Constructs that can attach Lambda function handlers to a service event
 */
export type EventHandlerSetter<EventName> = {
  setEventHandler(eventName: EventName, handler: IFunction): void;
};
