import { IFunction } from 'aws-cdk-lib/aws-lambda';

export type EventHandlerSetter<EventName> = {
  setEventHandler(eventName: EventName, handler: IFunction): void;
};
