import {
  ColorName,
  LogLevel,
  Printer,
  colorNames,
  format,
  printer,
} from '@aws-amplify/cli-core';
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-cloudwatch-logs';
import fs from 'fs';
import path from 'path';

/**
 * After reading events from all CloudWatch log groups how long should we wait to read more events.
 *
 * If there is some error with reading events (i.e. Throttle) then this is also how long we wait until we try again
 */
const SLEEP_MS = 2_000;

/**
 * Represents a CloudWatch Log Event that will be printed to the terminal
 */
type CloudWatchLogEvent = {
  /**
   * The log event message
   */
  readonly message: string;

  /**
   * The name of the log group
   */
  readonly logGroupName: string;

  /**
   * The time at which the event occurred
   */
  readonly timestamp: Date;
};

/**
 * Represents how an event from a CloudWatch Log Group will be displayed
 * Indexed off of logGroupName for easy retrieval during logs even polling
 */
type LogGroupEventDisplay = {
  friendlyName: string;
  color: ColorName;
};

type LogGroupStreamingCursor = {
  /**
   * The name of the log group
   */
  readonly logGroupName: string;

  /**
   * Start time
   */
  startTime: number;
};

/**
 * Monitors CloudWatch logs and stream it to stdout or a user provided file location
 * Consumers can activate and deactivate the monitor. The monitor on reactivation, starts
 * streaming from the last time it was deactivated to avoid missing any logs while the monitor
 * was deactivated.
 */
export class CloudWatchLogEventMonitor {
  /**
   * Determines from what time the logs should be streamed
   */
  private startTime: number;

  /**
   * Collection of all LogGroups that need to be streamed
   */
  private readonly allLogGroups: LogGroupStreamingCursor[] = [];

  private readonly logGroupEventDisplay: Record<string, LogGroupEventDisplay> =
    {};

  private active = false;

  private printer = printer; // default stdout

  private enableColors = true; // show colors on console but not while writing to files

  /**
   * Initializes the start time to be `now`
   */
  constructor(readonly cloudWatchLogsClient: CloudWatchLogsClient) {
    this.startTime = Date.now();
  }

  /**
   * resume writing/printing events
   * If output location file is specified, the logs will be appended to that file.
   * If the file doesn't exist it will be created.
   * @param outputLocation file location
   */
  activate = (outputLocation?: string): void => {
    if (outputLocation) {
      const targetPath = path.isAbsolute(outputLocation)
        ? outputLocation
        : path.resolve(process.cwd(), outputLocation);
      this.printer = new Printer(
        LogLevel.INFO,
        fs.createWriteStream(targetPath, { flags: 'a', autoClose: true })
      );
      this.enableColors = false;
    }

    this.active = true;
    this.scheduleNextTick(0);
  };

  /**
   * Pause the monitor so no new events are read
   * use case for this is when we are in the middle of performing a deployment
   * and don't want to interweave all the logs together with the CFN
   * deployment logs
   *
   * Also resets the start time to be when the new deployment was triggered so that we
   * start streaming the logs from when it was deactivated.
   * and clears the list of tracked log groups
   */
  pause = (): void => {
    this.active = false;
    this.startTime = Date.now();
    this.allLogGroups.splice(0, this.allLogGroups.length);
  };

  /**
   * Adds CloudWatch log groups to read log events from.
   * Since we could be watching multiple logs groups we need a friendly
   * name for to associate the log group to make it easier
   * for the user to identify which log groups are being monitored
   * @param friendlyResourceName The friendly name of the resource that is being monitored
   * @param logGroupName The log group to read events from
   */
  addLogGroups = (friendlyResourceName: string, logGroupName: string): void => {
    this.allLogGroups.push({
      logGroupName,
      startTime: this.startTime,
    });
    this.logGroupEventDisplay[logGroupName] = {
      friendlyName: friendlyResourceName,
      color: this.getNextColorForLogGroup(),
    };
  };

  /**
   * Pick the next color in the object `colors` in round robin fashion
   */
  private getNextColorForLogGroup = () => {
    return colorNames[
      this.allLogGroups.length % colorNames.length
    ] as ColorName;
  };

  private scheduleNextTick = (sleep: number): void => {
    setTimeout(() => void this.tick(), sleep);
  };

  private tick = async (): Promise<void> => {
    if (!this.active) {
      return;
    }
    try {
      const events = await this.readNewEvents();
      events.forEach((event: CloudWatchLogEvent) => {
        this.print(event);
      });
    } catch (error) {
      printer.log(
        `${format.error(
          'Error streaming logs from CloudWatch.'
        )} ${format.error(error)}`,
        LogLevel.ERROR
      );
      printer.log('Logs streaming has been paused.');
      this.pause();
    }

    this.scheduleNextTick(SLEEP_MS);
  };

  /**
   * Reads all new log events from a set of CloudWatch Log Groups in parallel
   */
  private readNewEvents = async (): Promise<Array<CloudWatchLogEvent>> => {
    const promises: Array<Promise<Array<CloudWatchLogEvent>>> = [];
    for (const logGroup of this.allLogGroups) {
      promises.push(this.readEventsFromLogGroup(logGroup));
    }
    return (await Promise.all(promises)).flat();
  };

  /**
   * Print out one CloudWatch event using the local printer.
   */
  private print = (event: CloudWatchLogEvent): void => {
    const cloudWatchEventDisplay =
      this.logGroupEventDisplay[event.logGroupName];
    if (!cloudWatchEventDisplay) {
      return;
    }

    if (this.enableColors) {
      this.printer.print(
        `[${format.color(
          cloudWatchEventDisplay.friendlyName,
          cloudWatchEventDisplay.color
        )}] ${format.note(
          event.timestamp.toLocaleTimeString()
        )} ${event.message.trim()}`
      );
    } else {
      this.printer.print(
        `[${
          cloudWatchEventDisplay.friendlyName
        }] ${event.timestamp.toLocaleTimeString()} ${event.message.trim()}`
      );
    }
  };

  /**
   * Reads all new log events from a CloudWatch Log Group
   * starting at either the time the last deployment was triggered or
   * when the last event was read on the previous tick
   */
  private readEventsFromLogGroup = async (
    cloudWatchLogsToMonitor: LogGroupStreamingCursor
  ): Promise<Array<CloudWatchLogEvent>> => {
    const events: CloudWatchLogEvent[] = [];

    // log events from some service are ingested faster than others
    // so we need to track the start/end time for each log group individually
    // to make sure that we process all events from each log group.
    // endTime tracks the latest event received
    const startTime = cloudWatchLogsToMonitor.startTime ?? this.startTime;
    let endTime = startTime;
    try {
      const response = await this.cloudWatchLogsClient.send(
        new FilterLogEventsCommand({
          logGroupName: cloudWatchLogsToMonitor.logGroupName,
          limit: 100,
          startTime,
        })
      );
      const filteredEvents = response.events ?? [];

      for (const event of filteredEvents) {
        if (event.message) {
          events.push({
            message: event.message,
            logGroupName: cloudWatchLogsToMonitor.logGroupName,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          });

          if (event.timestamp && endTime < event.timestamp) {
            endTime = event.timestamp;
          }
        }
      }
      // As long as there are _any_ events in the log group `filterLogEvents` will return a nextToken.
      // This is true even if these events are before `startTime`. So if we have 100 events and a nextToken
      // then assume that we have hit the limit and let the user know some messages have been suppressed.
      // We are essentially showing them a sampling (10000 events printed out is not very useful)
      if (filteredEvents.length === 100 && response.nextToken) {
        events.push({
          message:
            '>>> `sandbox` shows only the first 100 log messages - the rest have been truncated...',
          logGroupName: cloudWatchLogsToMonitor.logGroupName,
          timestamp: new Date(endTime),
        });
      }
    } catch (e) {
      // with Lambda functions the Log Group is not created
      // until something is logged, so just keep polling until
      // there is something to find
      if (e && e instanceof ResourceNotFoundException) {
        return [];
      }
      throw e;
    }
    cloudWatchLogsToMonitor.startTime = endTime + 1;
    return events;
  };
}
