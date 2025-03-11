import { AmplifyIOEventsBridge } from './amplify_io_events_bridge.js';
import { AmplifyEventLogger } from './amplify_event_loggers.js';

/**
 * Create a singleton for the AmplifyIOEventsBridge. There should
 * exist just one instance and used by all consumers.
 */
export class AmplifyIOEventsBridgeSingletonFactory {
  private instance: AmplifyIOEventsBridge | undefined;

  /**
   * Returns a singleton instance of a AmplifyIOEventsBridge
   */
  getInstance = (): AmplifyIOEventsBridge => {
    if (!this.instance) {
      const cdkEventLogger = new AmplifyEventLogger();
      this.instance = new AmplifyIOEventsBridge(
        cdkEventLogger.getEventLoggers()
      );
    }
    return this.instance;
  };
}

export const amplifyIOEventsBridgeFactory =
  new AmplifyIOEventsBridgeSingletonFactory();
