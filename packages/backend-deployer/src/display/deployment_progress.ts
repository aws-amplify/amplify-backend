/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
/* eslint-disable spellcheck/spell-checker */
import * as util from 'util';
import {
  CloudFormationClient,
  CloudFormationServiceException,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  GetTemplateCommand,
  StackEvent,
  TemplateStage,
} from '@aws-sdk/client-cloudformation';

import { RewritableBlock } from './rewritable_block.js';
import { ColorName, format, printer } from '@aws-amplify/cli-core';

export type WithDefaultPrinterProps = {
  /**
   * Total number of resources to update
   *
   * Used to calculate a progress bar.
   * @default - No progress reporting.
   */
  readonly resourcesTotal?: number;

  /**
   * Creation time of the change set
   *
   * This will be used to filter events, only showing those from after the change
   * set creation time.
   *
   * It is recommended to use this, otherwise the filtering will be subject
   * to clock drift between local and cloud machines.
   * @default - local machine's current time
   */
  readonly changeSetCreationTime?: Date;
};

/**
 *
 */
export class StackActivityMonitor {
  /**
   * Resource errors found while monitoring the deployment
   * TBD, why is this not used anymore?
   */
  public readonly errors = new Array<string>();

  private active = false;
  private activity: { [eventId: string]: StackEvent } = {};
  private resourceNameCache: {
    [logicalId: string]: string;
  } = {};
  private stacksHydrated: Set<string>;

  /**
   * Determines which events not to display
   */
  private startTime: number;

  /**
   * Current tick timer
   */
  private tickTimer?: NodeJS.Timeout;

  /**
   * Set to the activity of reading the current events
   */
  private readPromise?: Promise<any>;
  private printer: CurrentActivityPrinter;
  private stackName: string;
  /**
   * Create a Stack Activity Monitor using a default printer, based on context clues
   */

  /**
   * TBD
   */
  constructor(private readonly cfnClient: CloudFormationClient) {}

  /**
   * TBD
   */
  public start(
    stackName: string,
    props: PrinterProps = {
      resourceTypeColumnWidth: 30, // TBD
      stream: process.stdout,
    }
  ) {
    this.stackName = stackName;
    this.resourceNameCache = {};
    this.stacksHydrated = new Set();
    this.startTime = Date.now();
    this.active = true;
    this.printer = new CurrentActivityPrinter(props);
    this.printer.start();
    this.scheduleNextTick();
    return this;
  }

  /**
   * TBD
   */
  public async stop() {
    if (!this.active) return;

    this.active = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
    }

    // Do a final poll for all events. This is to handle the situation where DescribeStackStatus
    // already returned an error, but the monitor hasn't seen all the events yet and we'd end
    // up not printing the failure reason to users.
    await this.finalPollToEnd();

    await this.printer?.stop();
  }

  /**
   * TBD
   */
  private scheduleNextTick() {
    if (!this.active) {
      return;
    }

    this.tickTimer = setTimeout(
      () => void this.tick(),
      this.printer.updateSleep
    );
  }

  /**
   * TBD
   */
  private async tick() {
    if (!this.active) {
      return;
    }

    try {
      this.readPromise = this.readNewEvents();
      await this.readPromise;
      this.readPromise = undefined;

      // We might have been stop()ped while the network call was in progress.
      if (!this.active) {
        return;
      }

      await this.printer.print(this.resourceNameCache);
    } catch (e) {
      printer.print(
        `Error occurred while monitoring stack: ${format.error(e)}`
      );
    }
    this.scheduleNextTick();
  }

  /**
   * Reads all new events from the stack history
   *
   * The events are returned in reverse chronological order; we continue to the next page if we
   * see a next page and the last event in the page is new to us (and within the time window).
   * haven't seen the final event
   */
  private async readNewEvents(stackName?: string): Promise<void> {
    const stackToPollForEvents = stackName ?? this.stackName;
    try {
      await this.hydrateResourceNameCache(stackToPollForEvents);
      // eslint-disable-next-line amplify-backend-rules/no-empty-catch
    } catch (e) {
      // Ignore, we'll just print the LogicalResourceId as it is
      // console.log('failed hydration', e);
    }

    const events: StackEvent[] = [];
    const CFN_SUCCESS_STATUS = [
      'UPDATE_COMPLETE',
      'CREATE_COMPLETE',
      'DELETE_COMPLETE',
      'DELETE_SKIPPED',
    ];
    try {
      let nextToken: string | undefined;
      let finished = false;
      while (!finished) {
        const response = await this.cfnClient.send(
          new DescribeStackEventsCommand({
            StackName: stackToPollForEvents,
            NextToken: nextToken,
          })
        );
        const eventPage = response?.StackEvents ?? [];

        for (const event of eventPage) {
          if (!event.Timestamp || !event.EventId) {
            continue;
          }
          // Event from before we were interested in them
          if (event.Timestamp.valueOf() < this.startTime) {
            finished = true;
            break;
          }

          // Already seen this one
          if (event.EventId in this.activity) {
            finished = true;
            break;
          }

          // Fresh event
          events.push((this.activity[event.EventId] = event));

          if (
            event.ResourceType === 'AWS::CloudFormation::Stack' &&
            !CFN_SUCCESS_STATUS.includes(event.ResourceStatus ?? '')
          ) {
            // If the event is not for `this` stack and has a physical resource Id, recursively call for events in the nested stack
            if (
              event.PhysicalResourceId &&
              (event.PhysicalResourceId !== stackToPollForEvents ||
                event.LogicalResourceId !== stackToPollForEvents)
            ) {
              await this.readNewEvents(event.PhysicalResourceId);
            }
          }
        }

        // We're also done if there's nothing left to read
        nextToken = response?.NextToken;
        if (nextToken === undefined) {
          finished = true;
        }
      }
    } catch (e: unknown) {
      if (
        e instanceof CloudFormationServiceException &&
        e.name === 'ValidationError'
      ) {
        return;
      }
      throw e;
    }

    events.reverse();
    for (const event of events) {
      this.checkForErrors(event);
      this.printer.addActivity(event);
    }
  }

  /**
   * Perform a final poll to the end and flush out all events to the printer
   *
   * Finish any poll currently in progress, then do a final one until we've
   * reached the last page.
   */
  private async finalPollToEnd() {
    // If we were doing a poll, finish that first. It was started before
    // the moment we were sure we weren't going to get any new events anymore
    // so we need to do a new one anyway. Need to wait for this one though
    // because our state is single-threaded.
    if (this.readPromise) {
      await this.readPromise;
    }

    await this.readNewEvents();
  }

  /**
   * TBD
   */
  private checkForErrors(event: StackEvent) {
    if (!hasErrorMessage(event.ResourceStatus ?? '')) {
      return;
    }
    const isCancelled =
      (event.ResourceStatusReason ?? '').indexOf('cancelled') > -1;

    // Cancelled is not an interesting failure reason, nor is the stack message (stack
    // message will just say something like "stack failed to update")
    if (!isCancelled && event.StackName !== event.LogicalResourceId) {
      this.errors.push(event.ResourceStatusReason ?? '');
    }
  }

  private hydrateResourceNameCache = async (nestedStackId: string) => {
    if (!this.stacksHydrated.has(nestedStackId)) {
      this.stacksHydrated.add(nestedStackId);
    } else {
      return;
    }

    if (nestedStackId !== this.stackName) {
      // nested stack, the name is an ID here, first get the stackName
      // Then the stackName is in the format ${ rootStackName }-${ logicalId }-${ hash }
      // best thing to display is the logicalId here when the events while querying this
      // stack has it's own logical Id
      const nestedStack = (
        await this.cfnClient.send(
          new DescribeStacksCommand({
            StackName: nestedStackId,
          })
        )
      ).Stacks?.[0];

      const nestedStackName = nestedStack?.StackName;

      const parentStackName = (
        await this.cfnClient.send(
          new DescribeStacksCommand({
            StackName: nestedStack?.ParentId,
          })
        )
      ).Stacks?.[0].StackName;

      if (!nestedStackName || !parentStackName) {
        return;
      }

      // Don't override if we have already added this stack (useful for root stack)
      if (!this.resourceNameCache[nestedStackName]) {
        const nestedStackLogicalName = getStackLogicalName(nestedStackName);
        const nestedStackFriendlyName = getFriendlyNameFromStackName(
          nestedStackLogicalName
        );
        const parentStackFriendlyName = getFriendlyNameFromStackName(
          getStackLogicalName(parentStackName)
        );
        this.resourceNameCache[
          nestedStackName
        ] = `${nestedStackFriendlyName}NestedStack`;
        this.resourceNameCache[
          nestedStackLogicalName
        ] = `${parentStackFriendlyName}:${nestedStackFriendlyName}`;
      }
    } else {
      this.resourceNameCache[nestedStackId] = 'RootStack';
    }

    try {
      for (const stage of ['Original', 'Processed']) {
        const resourceDetail = await this.cfnClient.send(
          new GetTemplateCommand({
            StackName: nestedStackId,
            TemplateStage: stage as TemplateStage,
          })
        );

        const templateBody = resourceDetail.TemplateBody;
        if (templateBody) {
          const template = JSON.parse(templateBody);
          if (!template.Resources) {
            return;
          }
          for (const resourceName in template.Resources) {
            if (this.resourceNameCache[resourceName]) {
              continue;
            }
            const metadata = template.Resources[resourceName]['Metadata'];
            if (metadata) {
              const cdkPathComponents = (
                metadata['aws:cdk:path'] as string
              )?.split('/');
              if (cdkPathComponents && cdkPathComponents.length > 0) {
                cdkPathComponents.shift(); // first is always root stack name
                if (
                  cdkPathComponents[cdkPathComponents.length - 1] === 'Resource'
                ) {
                  //throw away trailing "Resource" as it's useless
                  cdkPathComponents.pop();
                }
                this.resourceNameCache[resourceName] =
                  cdkPathComponents.join(':');
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore, we can't read metadata
      return;
    }
  };
}

function getFriendlyNameFromStackName(stackLogicalName: string) {
  if (stackLogicalName.startsWith('function')) {
    return 'Function';
  } else if (stackLogicalName.startsWith('data')) {
    return 'Data';
  } else if (stackLogicalName.startsWith('auth')) {
    return 'Auth';
  } else if (stackLogicalName.startsWith('storage')) {
    return 'Storage';
  } else if (stackLogicalName.includes('sandbox')) {
    return 'RootStack';
  }
  return stackLogicalName;
}

function getStackLogicalName(stackName: string) {
  const parts = stackName.split('-');
  if (parts && parts.length > 2) {
    return parts[parts.length - 2];
  }
  return stackName;
}

function padRight(n: number, x: string): string {
  return x + ' '.repeat(Math.max(0, n - x.length));
}

/**
 * Infamous padLeft()
 */
function padLeft(n: number, x: string): string {
  return ' '.repeat(Math.max(0, n - x.length)) + x;
}

type PrinterProps = {
  /**
   * Total resources to deploy
   */
  readonly resourcesTotal?: number;

  /**
   * The with of the "resource type" column.
   */
  readonly resourceTypeColumnWidth: number;

  /**
   * Stream to write to
   */
  readonly stream: NodeJS.WriteStream;
};

export type IActivityPrinter = {
  readonly updateSleep: number;

  addActivity: (activity: StackEvent) => void;
  print: (resourceNameCache: { [logicalId: string]: string }) => void;
  start: () => void;
  stop: () => void;
};

abstract class ActivityPrinterBase implements IActivityPrinter {
  /**
   * Fetch new activity every 5 seconds
   */
  public readonly updateSleep: number = 5_000;

  /**
   * A list of resource IDs which are currently being processed
   */
  protected resourcesInProgress: Record<string, StackEvent> = {};

  /**
   * Previous completion state observed by logical ID
   *
   * We use this to detect that if we see a DELETE_COMPLETE after a
   * CREATE_COMPLETE, it's actually a rollback and we should DECREASE
   * resourcesDone instead of increase it
   */
  protected resourcesPrevCompleteState: Record<string, string> = {};

  /**
   * Count of resources that have reported a _COMPLETE status
   */
  protected resourcesDone: number = 0;

  /**
   * How many digits we need to represent the total count (for lining up the status reporting)
   */
  protected readonly resourceDigits: number = 0;

  protected readonly resourcesTotal?: number;

  protected rollingBack = false;

  protected readonly failures = new Array<StackEvent>();

  protected hookFailureMap = new Map<string, Map<string, string>>();

  protected readonly stream: NodeJS.WriteStream;

  constructor(protected readonly props: PrinterProps) {
    // +1 because the stack also emits a "COMPLETE" event at the end, and that wasn't
    // counted yet. This makes it line up with the amount of events we expect.
    this.resourcesTotal = props.resourcesTotal
      ? props.resourcesTotal + 1
      : undefined;

    // How many digits does this number take to represent?
    this.resourceDigits = this.resourcesTotal
      ? Math.ceil(Math.log10(this.resourcesTotal))
      : 0;

    this.stream = props.stream;
  }

  public failureReason(event: StackEvent) {
    const resourceStatusReason = event.ResourceStatusReason ?? '';
    const logicalResourceId = event.LogicalResourceId ?? '';
    const hookFailureReasonMap = this.hookFailureMap.get(logicalResourceId);

    if (hookFailureReasonMap !== undefined) {
      for (const hookType of hookFailureReasonMap.keys()) {
        if (resourceStatusReason.includes(hookType)) {
          return (
            resourceStatusReason + ' : ' + hookFailureReasonMap.get(hookType)
          );
        }
      }
    }
    return resourceStatusReason;
  }

  public addActivity(event: StackEvent) {
    const status = event.ResourceStatus;
    const hookStatus = event.HookStatus;
    const hookType = event.HookType;
    if (!status || !event.LogicalResourceId) {
      return;
    }

    if (
      status === 'ROLLBACK_IN_PROGRESS' ||
      status === 'UPDATE_ROLLBACK_IN_PROGRESS'
    ) {
      // Only triggered on the stack once we've started doing a rollback
      this.rollingBack = true;
    }

    if (status.endsWith('_IN_PROGRESS')) {
      this.resourcesInProgress[event.LogicalResourceId] = event;
    }

    if (hasErrorMessage(status)) {
      const isCancelled =
        (event.ResourceStatusReason ?? '').indexOf('cancelled') > -1;

      // Cancelled is not an interesting failure reason
      if (!isCancelled) {
        this.failures.push(event);
      }
    }

    if (status.endsWith('_COMPLETE') || status.endsWith('_FAILED')) {
      delete this.resourcesInProgress[event.LogicalResourceId];
    }

    if (status.endsWith('_COMPLETE_CLEANUP_IN_PROGRESS')) {
      this.resourcesDone++;
    }

    if (status.endsWith('_COMPLETE')) {
      const prevState =
        this.resourcesPrevCompleteState[event.LogicalResourceId];
      if (!prevState) {
        this.resourcesDone++;
      } else {
        // If we completed this before and we're completing it AGAIN, means we're rolling back.
        // Protect against silly underflow.
        this.resourcesDone--;
        if (this.resourcesDone < 0) {
          this.resourcesDone = 0;
        }
      }
      this.resourcesPrevCompleteState[event.LogicalResourceId] = status;
    }

    if (
      hookStatus !== undefined &&
      hookStatus.endsWith('_COMPLETE_FAILED') &&
      event.LogicalResourceId !== undefined &&
      hookType !== undefined
    ) {
      if (this.hookFailureMap.has(event.LogicalResourceId)) {
        this.hookFailureMap
          .get(event.LogicalResourceId)
          ?.set(hookType, event.HookStatusReason ?? '');
      } else {
        this.hookFailureMap.set(
          event.LogicalResourceId,
          new Map<string, string>()
        );
        this.hookFailureMap
          .get(event.LogicalResourceId)
          ?.set(hookType, event.HookStatusReason ?? '');
      }
    }
  }

  public start() {
    // Empty on purpose
  }

  public stop() {
    // Empty on purpose
  }

  public abstract print(resourceNameCache: {
    [logicalId: string]: string;
  }): void;
}

/**
 * Activity Printer which shows the resources currently being updated
 *
 * It will continuously reupdate the terminal and show only the resources
 * that are currently being updated, in addition to a progress bar which
 * shows how far along the deployment is.
 *
 * Resources that have failed will always be shown, and will be recapitulated
 * along with their stack trace when the monitoring ends.
 *
 * Resources that failed deployment because they have been cancelled are
 * not included.
 */
export class CurrentActivityPrinter extends ActivityPrinterBase {
  /**
   * This looks very disorienting sleeping for 5 seconds. Update quicker.
   */
  public readonly updateSleep: number = 2_000;

  // private oldLogLevel: LogLevel = LogLevel.DEFAULT;
  private block = new RewritableBlock(this.stream);

  /**
   * TBD
   */
  constructor(props: PrinterProps) {
    super(props);
  }

  /**
   * TBD
   */
  public async print(resourceNameCache: { [logicalId: string]: string }): Promise<void> {
    const lines = [];

    // Add a progress bar at the top
    const progressWidth = Math.max(
      Math.min(
        (this.block.width ?? 80) - PROGRESSBAR_EXTRA_SPACE - 1,
        MAX_PROGRESSBAR_WIDTH
      ),
      MIN_PROGRESSBAR_WIDTH
    );
    const prog = this.progressBar(progressWidth);
    if (prog) {
      lines.push('  ' + prog, '');
    }

    // Normally we'd only print "resources in progress", but it's also useful
    // to keep an eye on the failures and know about the specific errors asquickly
    // as possible (while the stack is still rolling back), so add those in.
    const toPrint: StackEvent[] = [
      ...this.failures,
      ...Object.values(this.resourcesInProgress),
    ];
    toPrint.sort((a, b) => a.Timestamp!.getTime() - b.Timestamp!.getTime());

    lines.push(
      ...toPrint.map((res) => {
        const color = colorFromStatusActivity(res.ResourceStatus);

        // Determine the displayable resource name
        let resourceName = res.EventId ?? ''; // default
        if (res.LogicalResourceId) {
          if (resourceNameCache[res.LogicalResourceId]) {
            resourceName = resourceNameCache[res.LogicalResourceId];
          } else {
            resourceName = res.LogicalResourceId;
          }
        }

        const timeStamp = padLeft(
          TIMESTAMP_WIDTH,
          new Date(res.Timestamp!).toLocaleTimeString()
        );
        const status = color
          ? format.color(
              padRight(
                STATUS_WIDTH,
                (res.ResourceStatus || '').slice(0, STATUS_WIDTH)
              ),
              color
            )
          : padRight(
              STATUS_WIDTH,
              (res.ResourceStatus || '').slice(0, STATUS_WIDTH)
            );

        const resourceType = padRight(
          this.props.resourceTypeColumnWidth,
          res.ResourceType || ''
        );

        const resourceNameToDisplay = color
          ? format.color(format.bold(shorten(100, resourceName)), color)
          : format.bold(shorten(100, resourceName));
        return `${timeStamp} | ${status} | ${resourceType} | ${resourceNameToDisplay}${this.failureReasonOnNextLine(
          res
        )}`;
      })
    );

    // console.log(lines);
    await this.block.displayLines(lines);
  }

  /**
   * TBD
   */
  public start() {
    // Need to prevent the waiter from printing 'stack not stable' every 5 seconds, it messes
    // with the output calculations.
    // this.oldLogLevel = logLevel;
    // setLogLevel(LogLevel.DEFAULT);
  }

  /**
   * TBD
   */
  public async stop() {
    // setLogLevel(this.oldLogLevel);

    // Print failures at the end
    const lines = new Array<string>();
    for (const failure of this.failures) {
      // Root stack failures are not interesting
      if (failure.StackName === failure.LogicalResourceId) {
        continue;
      }

      lines.push(
        util.format(
          format.color('%s | %s | %s | %s%s', 'Red') + '\n',
          padLeft(
            TIMESTAMP_WIDTH,
            new Date(failure.Timestamp!).toLocaleTimeString()
          ),
          padRight(
            STATUS_WIDTH,
            (failure.ResourceStatus || '').slice(0, STATUS_WIDTH)
          ),
          padRight(
            this.props.resourceTypeColumnWidth,
            failure.ResourceType || ''
          ),
          shorten(40, failure.LogicalResourceId ?? ''),
          this.failureReasonOnNextLine(failure)
        )
      );
    }

    // Display in the same block space, otherwise we're going to have silly empty lines.
    await this.block.displayLines(lines);
    await this.block.removeEmptyLines();
  }

  /**
   * TBD
   */
  private progressBar(width: number) {
    if (!this.resourcesTotal) {
      return '';
    }
    const fraction = Math.min(this.resourcesDone / this.resourcesTotal, 1);
    const innerWidth = Math.max(1, width - 2);
    const chars = innerWidth * fraction;
    const remainder = chars - Math.floor(chars);

    const fullChars = FULL_BLOCK.repeat(Math.floor(chars));
    const partialChar =
      PARTIAL_BLOCK[Math.floor(remainder * PARTIAL_BLOCK.length)];
    const filler = '·'.repeat(
      innerWidth - Math.floor(chars) - (partialChar ? 1 : 0)
    );

    const color: ColorName = this.rollingBack ? 'Yellow' : 'Green';

    return (
      '[' +
      format.color(fullChars + partialChar, color) +
      filler +
      `] (${this.resourcesDone}/${this.resourcesTotal})`
    );
  }

  /**
   * TBD
   */
  private failureReasonOnNextLine(event: StackEvent) {
    return hasErrorMessage(event.ResourceStatus ?? '')
      ? `\n${' '.repeat(TIMESTAMP_WIDTH + STATUS_WIDTH + 6)}${format.color(
          this.failureReason(event) ?? '',
          'Red'
        )}`
      : '';
  }
}

const FULL_BLOCK = '█';
const PARTIAL_BLOCK = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const MAX_PROGRESSBAR_WIDTH = 60;
const MIN_PROGRESSBAR_WIDTH = 10;
const PROGRESSBAR_EXTRA_SPACE =
  2 /* leading spaces */ +
  2 /* brackets */ +
  4 /* progress number decoration */ +
  6; /* 2 progress numbers up to 999 */

function hasErrorMessage(status: string) {
  return (
    status.endsWith('_FAILED') ||
    status === 'ROLLBACK_IN_PROGRESS' ||
    status === 'UPDATE_ROLLBACK_IN_PROGRESS'
  );
}

const colorFromStatusActivity = (status?: string): ColorName | undefined => {
  if (!status) {
    return;
  }

  if (status.endsWith('_FAILED')) {
    return 'Red';
  }

  if (
    status.startsWith('CREATE_') ||
    status.startsWith('UPDATE_') ||
    status.startsWith('IMPORT_')
  ) {
    return 'Green';
  }
  // For stacks, it may also be 'UPDDATE_ROLLBACK_IN_PROGRESS'
  if (status.indexOf('ROLLBACK_') !== -1) {
    return 'Yellow';
  }
  if (status.startsWith('DELETE_')) {
    return 'Yellow';
  }

  return;
};

function shorten(maxWidth: number, p: string) {
  if (p.length <= maxWidth) {
    return p;
  }
  const half = Math.floor((maxWidth - 3) / 2);
  return p.slice(0, half) + '...' + p.slice(-half);
}

const TIMESTAMP_WIDTH = 12;
const STATUS_WIDTH = 20;
