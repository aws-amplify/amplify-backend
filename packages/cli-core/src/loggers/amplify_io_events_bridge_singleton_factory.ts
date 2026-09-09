import { AmplifyIOEventsBridge } from './amplify_io_events_bridge.js';
import { AmplifyEventLogger } from './amplify_event_loggers.js';
import { AmplifyIOHost } from '@aws-amplify/plugin-types';
import { printer as globalPrinter } from '../printer.js';
import { Printer } from '../printer/printer.js';
/**
 * Create a singleton for the AmplifyIOEventsBridge. There should
 * exist just one instance and used by all consumers.
 */
export class AmplifyIOEventsBridgeSingletonFactory {
  private static instance: AmplifyIOEventsBridge | undefined;

  /**
   * Constructor for AmplifyIOEventsBridgeSingletonFactory. Takes a printer
   * instance to be used for logging.
   * @param printer a printer instance to be used for logging
   */
  constructor(private readonly printer: Printer = globalPrinter) {}

  /**
   * Returns a singleton instance of a AmplifyIOEventsBridge
   */
  getInstance = (): AmplifyIOHost => {
    if (!AmplifyIOEventsBridgeSingletonFactory.instance) {
      const cdkEventLogger = new AmplifyEventLogger(this.printer, this);
      AmplifyIOEventsBridgeSingletonFactory.instance =
        new AmplifyIOEventsBridge(
          cdkEventLogger.getEventLoggers(),
          this.printer,
        );
    }
    return AmplifyIOEventsBridgeSingletonFactory.instance;
  };
}
