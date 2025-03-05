/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
/* eslint-disable spellcheck/spell-checker */
import * as util from 'util';

import { StackEvent } from '@aws-sdk/client-cloudformation';

import { RewritableBlock } from './rewritable_block.js';
import { ColorName, format } from '../../format/format.js';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

/**
 * Activity Printer which shows the resources currently being updated
 *
 * It will continuously re-update the terminal and show only the resources
 * that are currently being updated, in addition to a progress bar which
 * shows how far along the deployment is.
 *
 * Resources that have failed will always be shown, and will be recapitulated
 * along with their stack trace when the monitoring ends.
 *
 * Resources that failed deployment because they have been cancelled are
 * not included.
 */
export class CurrentActivityPrinter {
  public readonly updateSleep: number = 2_000;
  private resourceNameCache: {
    [logicalId: string]: string;
  };

  /**
   * A list of resource IDs which are currently being processed
   */
  private resourcesInProgress: Record<string, StackEvent> = {};

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
   * How many digits we need to represent the total count (for lining up the status reporting)
   */
  private readonly resourceDigits: number = 0;

  private readonly resourcesTotal?: number;

  private rollingBack = false;

  private readonly failures = new Array<StackEvent>();

  private hookFailureMap = new Map<string, Map<string, string>>();

  private readonly getBlockWidth: () => number;
  private readonly getBlockHeight: () => number;
  private block;
  private rootStackDisplay = 'Root stack';

  /**
   * tbd
   */
  constructor(private readonly props: PrinterProps) {
    // +1 because the stack also emits a "COMPLETE" event at the end, and that wasn't
    // counted yet. This makes it line up with the amount of events we expect.
    this.resourcesTotal = props.resourcesTotal
      ? props.resourcesTotal + 1
      : undefined;

    // How many digits does this number take to represent?
    this.resourceDigits = this.resourcesTotal
      ? Math.ceil(Math.log10(this.resourcesTotal))
      : 0;

    this.getBlockWidth = props.getBlockWidth;
    this.getBlockHeight = props.getBlockHeight;
    this.block = new RewritableBlock(this.getBlockWidth, this.getBlockHeight);
    this.resourceNameCache = {};
  }

  /**
   * TBD
   */
  public addActivity(cfnEvent: CfnDeploymentStackEvent) {
    const metadata = cfnEvent.metadata;
    const event = cfnEvent.event;
    const status = event.ResourceStatus;
    const hookStatus = event.HookStatus;
    const hookType = event.HookType;
    if (
      !status ||
      !event.LogicalResourceId ||
      event.LogicalResourceId === 'CDKMetadata'
    ) {
      return;
    }

    // Hydrate friendly name cache
    if (
      event.ResourceType === 'AWS::CloudFormation::Stack' &&
      BackendIdentifierConversions.fromStackName(event.LogicalResourceId)
    ) {
      this.resourceNameCache[event.LogicalResourceId] = this.rootStackDisplay;
    }
    if (metadata && metadata.constructPath) {
      if (!(event.LogicalResourceId in this.resourceNameCache)) {
        this.resourceNameCache[event.LogicalResourceId] =
          this.normalizeConstructPath(metadata.constructPath);
      }
    }
    // Hydrate friendly name cache

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

  /**
   * TBD
   */
  public async print(): Promise<void> {
    const lines = [];

    // Add a progress bar at the top
    const progressWidth = Math.max(
      Math.min(
        this.getBlockHeight() - PROGRESSBAR_EXTRA_SPACE - 1,
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
    toPrint.sort((a, b) => {
      if (
        a.LogicalResourceId &&
        a.LogicalResourceId in this.resourceNameCache &&
        b.LogicalResourceId &&
        b.LogicalResourceId in this.resourceNameCache
      ) {
        // Always display the root stack first
        if (
          this.resourceNameCache[b.LogicalResourceId] === this.rootStackDisplay
        ) {
          return 1;
        } else if (
          this.resourceNameCache[a.LogicalResourceId] === this.rootStackDisplay
        ) {
          return -1;
        }
        return this.resourceNameCache[a.LogicalResourceId].localeCompare(
          this.resourceNameCache[b.LogicalResourceId]
        );
      }
      return a.Timestamp!.getTime() - b.Timestamp!.getTime();
    });

    let padding = 0;
    lines.push(
      ...toPrint
        .filter(
          // TBD Hide some of our resources but not all, e.g. custom customer's resources
          (res) => res.LogicalResourceId
          // && res.LogicalResourceId in this.resourceNameCache
        )
        .map((res) => {
          const color = colorFromStatusActivity(res.ResourceStatus);
          // We already filtered out everything else
          const constructPath =
            this.resourceNameCache[res.LogicalResourceId!] ??
            res.LogicalResourceId;

          let displayName = '';
          const paths = constructPath.split('/');
          const resourceName = paths.pop();
          if (resourceName === undefined || paths.length === 0) {
            displayName = constructPath;
            padding = 0;
          } else {
            padding = Math.min(paths.length - 1, padding);
            displayName = '  '.repeat(padding++) + '∟ ' + resourceName;
          }

          const timeStamp = this.padLeft(
            TIMESTAMP_WIDTH,
            new Date(res.Timestamp!).toLocaleTimeString()
          );
          const status = color
            ? format.color(
                this.padRight(
                  STATUS_WIDTH,
                  (res.ResourceStatus || '').slice(0, STATUS_WIDTH)
                ),
                color
              )
            : this.padRight(
                STATUS_WIDTH,
                (res.ResourceStatus || '').slice(0, STATUS_WIDTH)
              );

          const resourceType = this.padRight(
            this.props.resourceTypeColumnWidth,
            shorten(30, res.ResourceType?.split('::').slice(1).join(':') || '')
          );

          const resourceNameToDisplay = color
            ? format.color(format.bold(shorten(100, displayName)), color)
            : format.bold(shorten(100, displayName));
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
          this.padLeft(
            TIMESTAMP_WIDTH,
            new Date(failure.Timestamp!).toLocaleTimeString()
          ),
          this.padRight(
            STATUS_WIDTH,
            (failure.ResourceStatus || '').slice(0, STATUS_WIDTH)
          ),
          this.padRight(
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
  }

  /**
   * TBD
   */
  private normalizeConstructPath(constructPath: string): string {
    const nestedStackRegex =
      /(?<nestedStack>\w+)\.NestedStack\/\1\.NestedStackResource/;

    return constructPath
      .replace(nestedStackRegex, '$<nestedStack>')
      .replace('/amplifyAuth/', '/')
      .replace('/amplifyData/', '/');
  }

  /**
   * TBD
   */
  private failureReason(event: StackEvent) {
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

  /**
   * TBD
   */
  private padRight(n: number, x: string): string {
    return x + ' '.repeat(Math.max(0, n - x.length));
  }

  /**
   * Infamous padLeft()
   */
  private padLeft(n: number, x: string): string {
    return ' '.repeat(Math.max(0, n - x.length)) + x;
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

  /**
   * The with of the "resource type" column.
   */
  readonly resourceTypeColumnWidth: number;

  /**
   * width of the block in which to render the CFN progress
   */
  readonly getBlockWidth: () => number;

  /**
   * height  of the block in which to render the CFN progress
   */
  readonly getBlockHeight: () => number;
};
