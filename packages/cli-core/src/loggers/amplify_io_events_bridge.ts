import {
  AmplifyIOHost,
  AmplifyIoHostEventMessage,
  AmplifyIoHostEventRequestMessageIoRequest,
} from '@aws-amplify/plugin-types';
import { format } from '../format/format.js';
import { printer as globalPrinter } from '../printer.js';
import { LogLevel, Printer } from '../printer/printer.js';

/**
 * Implements IIoHost interface of AmplifyIOHost
 */
export class AmplifyIOEventsBridge implements AmplifyIOHost {
  /**
   * Constructor for AmplifyIOEventsBridge
   * @param eventHandlers - event handlers to be called when events are received
   * @param eventHandlers.notify - event handler for notify events
   */
  constructor(
    private readonly eventHandlers: {
      notify?: (<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>)[];
    },
    private readonly printer: Printer = globalPrinter,
  ) {}

  /**
   * Receive amplify events and fan out notifying anyone interested.
   */
  async notify<T>(msg: AmplifyIoHostEventMessage<T>): Promise<void> {
    if (!this.eventHandlers.notify) {
      return Promise.resolve();
    }
    const promises: Promise<void>[] = this.eventHandlers.notify?.flatMap(
      (handler) => handler(msg),
    );
    (await Promise.allSettled(promises))
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )
      .forEach((result) => {
        this.printer.log(
          `Failed to notify message '${msg.message}' with error ${format.error(result.reason)}`,
          LogLevel.WARN,
        );
      });
  }

  /**
   * Receive amplify events and fan out asking everyone if they have a response for this request
   * Custom event handlers are currently not supported for this event type
   */
  async requestResponse<T, U>(
    msg: AmplifyIoHostEventRequestMessageIoRequest<T, U>,
  ): Promise<U> {
    return Promise.resolve(msg.defaultResponse);
  }
}
