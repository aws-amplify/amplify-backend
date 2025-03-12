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
   * Receive amplify events and fan out notifying anyone interested.
   */
  async notify<T>(msg: AmplifyIoHostEventMessage<T>): Promise<void> {
    if (!this.eventHandlers.notify) {
      return Promise.resolve();
    }
    const promises: Promise<void>[] = this.eventHandlers.notify?.flatMap(
      (handler) => handler(msg)
    );
    await Promise.all(promises);
  }

  /**
   * Receive amplify events and fan out asking everyone if they have a response for this request
   */
  async requestResponse<T, U>(
    msg: AmplifyIoHostEventRequestMessageIoRequest<T, U>
  ): Promise<U> {
    if (!this.eventHandlers.requestResponse) {
      return Promise.resolve(msg.defaultResponse);
    }
    const promises: Promise<U>[] = this.eventHandlers.requestResponse.flatMap(
      (handler) => handler(msg)
    );
    // return the first defined response if available, else the default response
    const response = (await Promise.all(promises)).find((response) => response);
    return response ?? msg.defaultResponse;
  }
}
