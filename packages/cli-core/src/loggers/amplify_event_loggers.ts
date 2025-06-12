import { LogLevel, Printer } from '../printer/printer.js';
import { printer as globalPrinter, minimumLogLevel } from '../printer.js';
import { format } from '../format/format.js';
import {
  CfnDeploymentProgressLogger,
  CfnDeploymentStackEvent,
} from './cfn-deployment-progress/cfn_deployment_progress_logger.js';
import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';
import { WriteStream } from 'node:tty';
import { RewritableBlock } from './cfn-deployment-progress/rewritable_block.js';
import { AmplifyIOEventsBridgeSingletonFactory } from './amplify_io_events_bridge_singleton_factory.js';
import { EOL } from 'node:os';
import {
  context as openTelemetryContext,
  trace as openTelemetryTrace,
} from '@opentelemetry/api';
import { setSpanAttributes } from '@aws-amplify/platform-core';

/**
 * Amplify events logger class. Implements several loggers that connect
 * to the amplify_io_event_bridge for showing relevant information to customers
 */
export class AmplifyEventLogger {
  private cfnDeploymentProgressLogger: CfnDeploymentProgressLogger | undefined;
  private outputs = {};
  private isHotSwap = false;

  /**
   * a logger instance to be used for CDK events
   */
  constructor(
    private readonly printer: Printer = globalPrinter,
    private readonly amplifyIOEventsBridgeSingletonFactory: AmplifyIOEventsBridgeSingletonFactory,
  ) {}

  getEventLoggers = () => {
    if (minimumLogLevel === LogLevel.DEBUG) {
      return {
        notify: [this.debug],
      };
    }
    const loggers = [this.amplifyNotifications, this.cdkDeploymentProgress];
    if (this.printer.ttyEnabled) {
      loggers.push(this.fancyCfnDeploymentProgress);
    } else {
      loggers.push(this.nonTtyCfnDeploymentProgress);
    }
    return {
      notify: loggers,
    };
  };

  /**
   * Log debug messages
   */
  debug = <T>(msg: AmplifyIoHostEventMessage<T>): Promise<void> => {
    if (msg.level === 'trace' || msg.level === 'debug') {
      if (
        msg.data &&
        typeof msg.data === 'object' &&
        'sdkLevel' in msg.data &&
        'content' in msg.data &&
        Array.isArray(msg.data.content)
      ) {
        msg.data.content.forEach(
          (trace: { clientName: string; commandName: string }) => {
            this.printer.log(
              `AWS SDK Call ${trace.clientName}: ${trace.commandName}`,
              LogLevel.DEBUG,
            );
          },
        );
      } else {
        this.printer.log(
          `[${msg.action}: ${msg.code}] ${msg.message}`,
          LogLevel.DEBUG,
        );
      }
    } else {
      this.printer.log(
        `[${format.color(
          `${msg.action}: ${msg.code}`,
          msg.level === 'error'
            ? 'Red'
            : msg.level === 'warn'
              ? 'Yellow'
              : 'Green',
        )}] ${format.note(
          msg.time.toLocaleTimeString(),
        )} ${msg.message.trim()} ${
          msg.data ? this.safeJsonStringifyForDebug(msg.data) : ''
        }`,
        LogLevel.DEBUG,
      );
    }
    return Promise.resolve();
  };

  amplifyNotifications = async <T>(
    msg: AmplifyIoHostEventMessage<T>,
  ): Promise<void> => {
    if (msg.action !== 'amplify') {
      return;
    }
    switch (msg.code) {
      case 'TS_STARTED':
        this.printer.startSpinner('Running type checks...');
        return;
      case 'TS_FINISHED':
        this.printer.stopSpinner();
        break;
      case 'SYNTH_STARTED':
        this.printer.startSpinner('Synthesizing backend...');
        return;
      case 'SYNTH_FINISHED':
        this.printer.stopSpinner();
        break;
      case 'DEPLOY_STARTED':
        this.printer.stopSpinner();
        break;
      case 'DEPLOY_FAILED':
        this.isHotSwap = false;
        return;
      case 'AMPLIFY_CFN_PROGRESS_UPDATE':
        if (!this.printer.isSpinnerRunning()) {
          this.printer.startSpinner('Deployment in progress...');
        }
        this.printer.updateSpinner({ prefixText: msg.message });
        return;
      default:
        return;
    }
    this.printer.log(
      msg.level === 'result'
        ? `${format.success('✔')} ${msg.message}`
        : msg.level === 'error'
          ? format.error(msg.message)
          : msg.message,
      msg.level === 'error' ? LogLevel.ERROR : LogLevel.INFO,
    );
  };

  cdkDeploymentProgress = async <T>(
    msg: AmplifyIoHostEventMessage<T>,
  ): Promise<void> => {
    // Asset publishing if any.
    if (msg.message.includes('Checking for previously published assets')) {
      if (!this.printer.isSpinnerRunning()) {
        this.printer.startSpinner('Building and publishing assets...');
      }
      return Promise.resolve();
    }

    // Hot swap deployment
    if (msg.code === 'CDK_TOOLKIT_I5403') {
      const hotswappedResources = this.extractResourceNameFromHotSwapMessage(
        msg.data,
      );
      let message = msg.message;
      if (hotswappedResources && hotswappedResources.length > 0) {
        this.isHotSwap = true;
        message = hotswappedResources
          .map(
            (resource) =>
              `${format.success('✔')} Updated ${resource.resourceType} ${resource.resourceName}`,
          )
          .join(EOL);
      }
      if (this.printer.isSpinnerRunning()) {
        this.printer.stopSpinner();
        this.printer.log(message);
        this.printer.startSpinner('Deployment in progress...');
      } else {
        this.printer.log(message);
      }
    }

    // CFN Outputs we care about. CDK_TOOLKIT_I5900 code represents outputs message.
    // We save it so we can display at the end of the deployment.
    if (msg.code === 'CDK_TOOLKIT_I5900') {
      if (
        msg.data &&
        typeof msg.data === 'object' &&
        'outputs' in msg.data &&
        msg.data.outputs &&
        typeof msg.data.outputs === 'object'
      ) {
        this.outputs = msg.data.outputs;
      }
    }

    // Successful deployment or destruction with timing
    if (msg.code === 'CDK_TOOLKIT_I5000' || msg.code === 'CDK_TOOLKIT_I7000') {
      if (
        msg.data &&
        typeof msg.data === 'object' &&
        'duration' in msg.data &&
        msg.data.duration &&
        typeof msg.data.duration === 'number'
      ) {
        this.printer.log(
          `${format.success('✔')} Deployment completed in ${
            msg.data.duration / 1000
          } seconds`,
        );
        if (
          this.outputs &&
          'awsAppsyncApiEndpoint' in this.outputs &&
          this.outputs.awsAppsyncApiEndpoint
        ) {
          this.printer.log(
            `AppSync API endpoint = ${format.link(
              this.outputs.awsAppsyncApiEndpoint as string,
            )}`,
          );
        }
        const span = openTelemetryTrace.getSpan(openTelemetryContext.active());
        if (this.isHotSwap && span) {
          setSpanAttributes(span, {
            latency: {
              hotSwap: msg.data.duration,
            },
          });
          this.isHotSwap = false;
        } else if (span) {
          setSpanAttributes(span, {
            latency: {
              deployment: msg.data.duration,
            },
          });
        }
      }
    }
  };

  /**
   * Displays pretty print of cfn deployment progress. Disabled if debug logging is turned on
   * @param msg a CDK event
   */
  fancyCfnDeploymentProgress = async <T>(
    msg: AmplifyIoHostEventMessage<T>,
  ): Promise<void> => {
    // 5100 -> Deployment starts 7100 -> Destroy starts
    if (
      (msg.code === 'CDK_TOOLKIT_I5100' || msg.code === 'CDK_TOOLKIT_I7100') &&
      !this.cfnDeploymentProgressLogger
    ) {
      if (msg.code === 'CDK_TOOLKIT_I5100') {
        // Mark assets published. We use "deploy started" as a cue to mark that all assets have been published
        await this.amplifyIOEventsBridgeSingletonFactory.getInstance().notify({
          message: `Built and published assets`,
          code: 'DEPLOY_STARTED',
          action: 'amplify',
          time: new Date(),
          level: 'result',
          data: undefined,
        });
      }

      // Start deployment progress display
      this.cfnDeploymentProgressLogger = this.getNewCfnDeploymentProgressLogger(
        this.printer,
      );
      this.printer.startSpinner('Deployment in progress...', {
        timeoutSeconds: 300,
      });
    }

    // Stop deployment progress display
    // 5000 includes deployment time
    // 5503 is when the deployment is completed (not emitted for some updates but emitted for destroy and fails)
    // 5900 includes the stack outputs
    // 7900 is when the stack is destroyed
    if (
      msg.code === 'CDK_TOOLKIT_I5000' ||
      msg.code === 'CDK_TOOLKIT_I5503' ||
      msg.code === 'CDK_TOOLKIT_I5900' ||
      msg.code === 'CDK_TOOLKIT_I7900'
    ) {
      if (this.cfnDeploymentProgressLogger) {
        this.printer.stopSpinner();
        this.cfnDeploymentProgressLogger = undefined;
      }
    }

    // CFN Deployment progress events information
    if (
      msg.code === 'CDK_TOOLKIT_I5502' &&
      msg.data &&
      typeof msg.data === 'object' &&
      'event' in msg.data
    ) {
      const event = msg.data as CfnDeploymentStackEvent;
      this.cfnDeploymentProgressLogger?.addActivity(event);
    }

    // CDK Marker that deployment is still in progress, we take this opportunity
    // to display the aggregated events
    if (
      msg.code === 'CDK_TOOLKIT_I0000' &&
      msg.message.includes('has an ongoing operation in progress')
    ) {
      await this.cfnDeploymentProgressLogger?.print();
    }
    return Promise.resolve();
  };

  /**
   * Non fancy cfn deployment progress for ci/cd or files
   */
  nonTtyCfnDeploymentProgress = async <T>(
    msg: AmplifyIoHostEventMessage<T>,
  ): Promise<void> => {
    if (msg.code === 'CDK_TOOLKIT_I5100') {
      await this.amplifyIOEventsBridgeSingletonFactory.getInstance().notify({
        message: `Built and published assets`,
        code: 'DEPLOY_STARTED',
        action: 'amplify',
        time: new Date(),
        level: 'result',
        data: undefined,
      });
    }
    if (msg.code === 'CDK_TOOLKIT_I5502') {
      // CDKs formatted cfn deployment progress
      this.printer.print(msg.message);
    }
  };

  private getNewCfnDeploymentProgressLogger = (printer: Printer) => {
    const getBlockWidth = () =>
      printer.stdout instanceof WriteStream ? printer.stdout.columns : 600;
    const getBlockHeight = () =>
      printer.stdout instanceof WriteStream ? printer.stdout.rows : 100;
    return new CfnDeploymentProgressLogger({
      getBlockWidth,
      rewritableBlock: new RewritableBlock(
        getBlockWidth,
        getBlockHeight,
        this.amplifyIOEventsBridgeSingletonFactory.getInstance(),
      ),
    });
  };

  private extractResourceNameFromHotSwapMessage = (
    data: unknown,
  ): { resourceType: string; resourceName: string }[] | undefined => {
    if (
      data &&
      typeof data === 'object' &&
      'resources' in data &&
      Array.isArray(data.resources)
    ) {
      return data.resources.map(
        (resource: {
          logicalId: string;
          resourceType: string;
          metadata?: { constructPath?: string };
        }) => {
          return {
            resourceName:
              resource?.metadata?.constructPath ?? resource.logicalId,
            resourceType: resource.resourceType,
          };
        },
      );
    }
    return undefined;
  };

  private safeJsonStringifyForDebug = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return 'Failed to deserialize data';
    }
  };
}
