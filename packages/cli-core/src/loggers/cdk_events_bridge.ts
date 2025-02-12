import { IIoHost, IoMessage, IoRequest } from '@aws-cdk/toolkit';

/**
 * Implements IIoHost interface of CDK Toolkit
 */
export class CDKEventsBridgeIoHost implements IIoHost {
  /**
   * a
   */
  constructor(
    private readonly eventHandlers: {
      notify?: (<T>(msg: IoMessage<T>) => Promise<void>)[];
      requestResponse?: (<T, U>(msg: IoRequest<T, U>) => Promise<U>)[];
    }
  ) {}

  /**
   * Receive cdk events and fan out.
   */
  notify<T>(msg: IoMessage<T>): Promise<void> {
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
  requestResponse<T, U>(msg: IoRequest<T, U>): Promise<U> {
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
