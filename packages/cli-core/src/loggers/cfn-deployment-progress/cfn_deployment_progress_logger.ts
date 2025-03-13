import { StackEvent } from '@aws-sdk/client-cloudformation';

import { RewritableBlock } from './rewritable_block.js';
import { ColorName, format } from '../../format/format.js';
import { EOL } from 'os';

/**
 * Collects events from CDK Toolkit about cfn deployment and structures them
 * nicely for printing.
 *
 * It will continuously re-update the cfn deployment progress and show only the resources
 * that are currently being updated, in addition to a progress bar which
 * shows how far along the deployment is.
 *
 * Resources that have failed will always be shown, and will be recapitulated
 * along with their stack trace when the monitoring ends.
 *
 * Resources that failed deployment because they have been canceled are
 * not included.
 */
export class CfnDeploymentProgressLogger {
  // Keeps a cache/mapping of LogicalResourceId <-> Friendly resource name along with hierarchy
  // Friendly name is formatted as a path e.g. NestedStackName/LambdaFunction/ServiceRole
  private resourceNameCache: {
    [logicalId: string]: string;
  };

  /**
   * A list of resource IDs which are currently being processed
   */
  private resourcesInProgress: Record<string, StackEvent> = {};

  private resourceTypeColumnWidth = 25;

  /**
   * Previous completion state observed by logical ID
   *
   * We use this to detect that if we see a DELETE_COMPLETE after a
   * CREATE_COMPLETE, it's actually a rollback and we should DECREASE
   * resourcesDone instead of increase it
   */
  private resourcesPrevCompleteState: Record<string, string> = {};

  /**
   * Count of resources that have reported a _COMPLETE status
   */
  private resourcesDone: number = 0;

  /**
   * Total number of resources (inclusive of all nested stacks and their resources)
   */
  private readonly resourcesTotal?: number;

  private rollingBack = false;

  private readonly failures = new Array<StackEvent>();

  private block;
  private rootStackDisplay = 'Root stack';
  private timeStampWidth = 12;
  private statusWidth = 20;
  private resourceNameIndentation = 0;
  private readonly getBlockWidth: () => number;

  /**
   * Instantiate the CFN deployment progress builder
   */
  constructor(private readonly props: PrinterProps) {
    // +1 because the stack also emits a "COMPLETE" event at the end, and that wasn't
    // counted yet. This makes it line up with the amount of events we expect.
    this.resourcesTotal = props.resourcesTotal
      ? props.resourcesTotal + 1
      : undefined;

    this.getBlockWidth = props.getBlockWidth;
    this.block = props.rewritableBlock;
    this.resourceNameCache = {};
  }

  /**
   * Add a new CDK event corresponding to CFN deployment progress
   */
  public addActivity(cfnEvent: CfnDeploymentStackEvent) {
    const metadata = cfnEvent.metadata;
    const event = cfnEvent.event;
    const status = event.ResourceStatus;

    if (
      !status ||
      !event.LogicalResourceId ||
      event.LogicalResourceId === 'CDKMetadata'
    ) {
      return;
    }

    // Hydrate friendly name resource cache
    if (event.ResourceType === 'AWS::CloudFormation::Stack') {
      const nestedStackName = this.getFriendlyNameFromNestedStackName(
        event.LogicalResourceId
      );
      if (nestedStackName) {
        this.resourceNameCache[event.LogicalResourceId] = nestedStackName;
      }
    }
    if (metadata && metadata.constructPath) {
      if (!(event.LogicalResourceId in this.resourceNameCache)) {
        this.resourceNameCache[event.LogicalResourceId] =
          this.normalizeConstructPath(metadata.constructPath);
      }
    }
    // Hydrate friendly name resource cache

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

    if (this.isFailureStatus(event)) {
      const isCanceled =
        // eslint-disable-next-line spellcheck/spell-checker
        (event.ResourceStatusReason ?? '').indexOf('cancelled') > -1;

      // Canceled is not an interesting failure reason
      if (!isCanceled) {
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
  }

  /**
   * Formats the current progress and pass it to a rewritable block for display
   */
  public async print(): Promise<void> {
    this.resourceNameIndentation = 0;
    const lines = [];

    // Add a progress bar at the top if available
    const progress = this.progressBar();

    if (progress) {
      lines.push('  ' + progress, '');
    }

    // Normally we'd only print "resources in progress", but it's also useful
    // to keep an eye on the failures and know about the specific errors as quickly
    // as possible (while the stack is still rolling back), so add those in.
    const toPrint: StackEvent[] = [
      ...this.failures,
      ...Object.values(this.resourcesInProgress),
    ];
    toPrint.sort((a, b) => {
      if (
        a.LogicalResourceId &&
        a.LogicalResourceId in this.resourceNameCache &&
        b.LogicalResourceId &&
        b.LogicalResourceId in this.resourceNameCache
      ) {
        // Always display the root stack first
        if (
          this.resourceNameCache[b.LogicalResourceId].startsWith(
            this.rootStackDisplay
          ) &&
          !this.resourceNameCache[a.LogicalResourceId].startsWith(
            this.rootStackDisplay
          )
        ) {
          return 1;
        }
        if (
          this.resourceNameCache[a.LogicalResourceId].startsWith(
            this.rootStackDisplay
          ) &&
          !this.resourceNameCache[b.LogicalResourceId].startsWith(
            this.rootStackDisplay
          )
        ) {
          return -1;
        }
        // Rest order them lexicographical so that we "group" all child resources together
        return this.resourceNameCache[a.LogicalResourceId].localeCompare(
          this.resourceNameCache[b.LogicalResourceId]
        );
      }
      // If we don't have friendly names, just order them based on the time
      return a.Timestamp!.getTime() - b.Timestamp!.getTime();
    });

    lines.push(
      ...toPrint
        .filter(
          // If we don't have LogicalResourceId we don't have anything
          (res) => res.LogicalResourceId
        )
        .map((res) => {
          const color = this.colorFromStatusActivity(res.ResourceStatus);

          return this.getFormattedLine(res, color);
        })
    );

    await this.block.displayLines(lines);
  }

  /**
   * Extract nested stack names
   */
  private normalizeConstructPath = (constructPath: string): string => {
    // Don't run regex on long strings, they are most likely not valid and could cause DOS attach. See CodeQL's js/polynomial-redos
    if (constructPath.length > 1000) return constructPath;
    const nestedStackRegex =
      /(?<nestedStack>[a-zA-Z0-9_]+)\.NestedStack\/\1\.NestedStackResource$/;

    return constructPath
      .replace(nestedStackRegex, '$<nestedStack>')
      .replace('/amplifyAuth/', '/')
      .replace('/amplifyData/', '/');
  };

  /**
   * Extract the failure reason from stack events
   */
  private failureReason = (event: StackEvent) => {
    return event.ResourceStatusReason ?? '';
  };

  /**
   * If we have total number of resources, format the progress bar and return
   */
  private progressBar = () => {
    const FULL_BLOCK = '█';
    const PARTIAL_BLOCK = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
    const MAX_PROGRESSBAR_WIDTH = 500;
    const MIN_PROGRESSBAR_WIDTH = 10;
    const PROGRESSBAR_EXTRA_SPACE =
      2 /* leading spaces */ +
      2 /* brackets */ +
      4 /* progress number decoration */ +
      6; /* 2 progress numbers up to 999 */

    const width = Math.max(
      Math.min(
        this.getBlockWidth() - PROGRESSBAR_EXTRA_SPACE - 1,
        MAX_PROGRESSBAR_WIDTH
      ),
      MIN_PROGRESSBAR_WIDTH
    );

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
  };

  /**
   * Format the failure reason to be on the next line
   */
  private failureReasonOnNextLine = (event: StackEvent) => {
    return this.isFailureStatus(event)
      ? `${EOL}${' '.repeat(
          this.timeStampWidth + this.statusWidth + 6
        )}${format.color(this.failureReason(event) ?? '', 'Red')}`
      : '';
  };

  private isFailureStatus = (event: StackEvent) => {
    if (
      (event.ResourceStatusReason?.includes(
        'The following resource(s) failed'
      ) ||
        event.ResourceStatusReason === 'Initiated by parent stack') &&
      event.ResourceType === 'AWS::CloudFormation::Stack'
    ) {
      // Useless nested stack failure messages
      return false;
    }
    return (
      (event.ResourceStatus && event.ResourceStatus.endsWith('_FAILED')) ||
      event.ResourceStatus === 'ROLLBACK_IN_PROGRESS' ||
      event.ResourceStatus === 'UPDATE_ROLLBACK_IN_PROGRESS'
    );
  };

  private getFormattedLine = (event: StackEvent, color?: ColorName) => {
    const timeStamp = this.padLeft(
      this.timeStampWidth,
      new Date(event.Timestamp!).toLocaleTimeString()
    );
    const status = color
      ? format.color(
          this.padRight(
            this.statusWidth,
            (event.ResourceStatus || '').slice(0, this.statusWidth)
          ),
          color
        )
      : this.padRight(
          this.statusWidth,
          (event.ResourceStatus || '').slice(0, this.statusWidth)
        );

    const resourceType = this.padRight(
      this.resourceTypeColumnWidth,
      this.shorten(
        this.resourceTypeColumnWidth,
        event.ResourceType?.split('::').slice(1).join(':') || ''
      )
    );

    const formattedResourceName = this.getFormattedResourceDisplayName(
      event.LogicalResourceId!
    );
    const resourceNameToDisplay = color
      ? format.color(
          format.bold(this.shorten(100, formattedResourceName)),
          color
        )
      : format.bold(this.shorten(100, formattedResourceName));
    return `${timeStamp} | ${status} | ${resourceType} | ${resourceNameToDisplay}${this.failureReasonOnNextLine(
      event
    )}`;
  };

  private getFormattedResourceDisplayName = (logicalResourceId: string) => {
    const constructPath =
      this.resourceNameCache[logicalResourceId] ?? logicalResourceId;

    let resourceNameDisplay = '';
    const paths = constructPath.split('/');
    const resourceName = paths.pop();
    if (resourceName === undefined || paths.length === 0) {
      // If there is no hierarchy we just display as-is with no padding
      resourceNameDisplay = constructPath;
      this.resourceNameIndentation = 0;
    } else {
      // Figure out the padding based on the hierarchy of this resource but
      // make sure it's never more than 1 than the previous padding.
      this.resourceNameIndentation = Math.min(
        paths.length - 1,
        this.resourceNameIndentation
      );
      resourceNameDisplay =
        '  '.repeat(this.resourceNameIndentation++) + '∟ ' + resourceName;
    }
    return resourceNameDisplay;
  };

  /**
   * For a typical nested stack, CFN generate events as follows
   *
   * When querying for Root Stack
   * RootStack events (*)
   * ∟ NestedStack events
   *
   * When querying for Nested Stack
   * NestedStack events (*)
   * ∟ Resource events
   *
   * For the * marked resources, cdk doesn't include metadata, so we don't have
   * a way to show friendly names. This method tries to identify these stacks
   * and make them show up in Root stack hierarchy
   */
  private getFriendlyNameFromNestedStackName = (
    stackName: string
  ): string | undefined => {
    const parts = stackName.split('-');
    if (parts && parts.length === 7 && parts[3] === 'sandbox') {
      return this.rootStackDisplay + '/' + parts[5].slice(0, -8) + ' stack';
    } else if (parts && parts.length === 5) {
      if (parts[3] === 'sandbox') {
        return this.rootStackDisplay;
      }
    }
    return undefined;
  };

  private colorFromStatusActivity = (
    status?: string
  ): ColorName | undefined => {
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

  private shorten = (maxWidth: number, p: string) => {
    if (p.length <= maxWidth) {
      return p;
    }
    const half = Math.floor((maxWidth - 3) / 2);
    return p.slice(0, half) + '...' + p.slice(-half);
  };

  private padRight = (n: number, x: string): string =>
    x + ' '.repeat(Math.max(0, n - x.length));

  private padLeft = (n: number, x: string): string =>
    ' '.repeat(Math.max(0, n - x.length)) + x;
}

export type CfnDeploymentStackEvent = {
  deployment?: string;
  event: StackEvent;
  metadata?: {
    entry: { [key: string]: string };
    constructPath: string;
  };
  progress?: {
    total: number;
    completed: number;
    formatted: string;
  };
};

type PrinterProps = {
  /**
   * Total resources to deploy
   */
  readonly resourcesTotal?: number;

  readonly rewritableBlock: RewritableBlock;

  /**
   * width of the block in which to render the CFN progress. It's a function since windows height and width are dynamic
   */
  readonly getBlockWidth: () => number;
};
