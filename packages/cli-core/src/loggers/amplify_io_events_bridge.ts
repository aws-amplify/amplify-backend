import {
  AmplifyIOHost,
  AmplifyIoHostEventMessage,
  AmplifyIoHostEventRequestMessageIoRequest,
} from '@aws-amplify/plugin-types';

/**
 * Implements IIoHost interface of AmplifyIOHost
 */
export class AmplifyIOEventsBridge implements AmplifyIOHost {
  /**
   * a
   */
  constructor(
    private readonly eventHandlers: {
      notify?: (<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>)[];
      requestResponse?: (<T, U>(
        msg: AmplifyIoHostEventRequestMessageIoRequest<T, U>
      ) => Promise<U>)[];
    }
  ) {}

  /**
   * Receive cdk events and fan out.
   */
  notify<T>(msg: AmplifyIoHostEventMessage<T>): Promise<void> {
    if (!this.eventHandlers.notify) {
      return Promise.resolve();
    }
    const promises: Promise<void>[] = this.eventHandlers.notify?.flatMap(
      (handler) => handler(msg)
    );
    return Promise.any(promises);
  }

  /**
   * Receive cdk events and fan out
   */
  requestResponse<T, U>(
    msg: AmplifyIoHostEventRequestMessageIoRequest<T, U>
  ): Promise<U> {
    if (!this.eventHandlers.requestResponse) {
      return Promise.resolve(msg.defaultResponse);
    }
    const promises: Promise<U>[] = this.eventHandlers.requestResponse.flatMap(
      (handler) => handler(msg)
    );
    // TBD, return the first undefined response maybe
    return Promise.any(promises);
  }
}
