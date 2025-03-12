import { AmplifyIOEventsBridge } from './amplify_io_events_bridge.js';
import { AmplifyEventLogger } from './amplify_event_loggers.js';
import { AmplifyIOHost } from '@aws-amplify/plugin-types';

/**
 * Create a singleton for the AmplifyIOEventsBridge. There should
 * exist just one instance and used by all consumers.
 */
export class AmplifyIOEventsBridgeSingletonFactory {
  private static instance: AmplifyIOEventsBridge | undefined;

  /**
   * Returns a singleton instance of a AmplifyIOEventsBridge
   */
  getInstance = (): AmplifyIOHost => {
    if (!AmplifyIOEventsBridgeSingletonFactory.instance) {
      const cdkEventLogger = new AmplifyEventLogger();
      AmplifyIOEventsBridgeSingletonFactory.instance =
        new AmplifyIOEventsBridge(cdkEventLogger.getEventLoggers());
    }
    return AmplifyIOEventsBridgeSingletonFactory.instance;
  };
}

export const amplifyIOEventsBridgeFactory =
  new AmplifyIOEventsBridgeSingletonFactory();
