import { AmplifyIOEventsBridge } from './amplify_io_events_bridge.js';
import { AmplifyEventLogger } from './amplify_event_loggers.js';

/**
 * TBD
 */
export class AmplifyIOEventsBridgeSingletonFactory {
  private instance: AmplifyIOEventsBridge | undefined;
  /**
   * sandboxIdResolver allows sandbox to lazily load the sandbox backend id on demand
   */
  constructor() {}

  /**
   * Returns a singleton instance of a Sandbox
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
