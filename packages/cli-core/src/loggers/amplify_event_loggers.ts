/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogLevel } from '../printer/printer.js';
import { minimumLogLevel, printer } from '../printer.js';
import { format } from '../format/format.js';
import {
  CfnDeploymentProgressLogger,
  CfnDeploymentStackEvent,
} from './cfn-deployment-progress/cfn_deployment_progress_logger.js';
import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';
import { WriteStream } from 'tty';

/**
 * Amplify events logger class. Implements several loggers that connect
 * to the amplify_io_event_bridge for showing relevant information to customers
 */
export class AmplifyEventLogger {
  private printer = printer; // default stdout
  private cfnDeploymentProgressLogger: CfnDeploymentProgressLogger | undefined;
  private outputs = {};
  private testingData: any[] = [];

  /**
   * a logger instance to be used for CDK events
   */
  constructor() {}

  getEventLoggers = () => {
    if (minimumLogLevel === LogLevel.DEBUG) {
      return {
        notify: [this.debug],
      };
    }
    const loggers = [this.amplifyNotifications, this.cdkDeploymentProgress];
    if (this.printer.enableTTY) {
      loggers.push(this.fancyCfnDeploymentProgress);
    } else {
      loggers.push(this.nonTtyCfnDeploymentProgress);
    }
    return {
      notify: loggers,
    };
  };

  // eslint-disable-next-line @shopify/prefer-early-return
  testing = <T>(msg: AmplifyIoHostEventMessage<T>): Promise<void> => {
    if (
      [
        'CDK_TOOLKIT_I5501',
        'CDK_TOOLKIT_I5503',
        'CDK_TOOLKIT_I0000',
        'CDK_TOOLKIT_I5900',
        'CDK_TOOLKIT_I5000',
      ].includes(msg.code) ||
      msg.message.includes('deploying...')
    ) {
      this.testingData.push({ code: msg.code, message: msg.message });
    }
    if (
      msg.code === 'CDK_TOOLKIT_I5502' &&
      msg.data &&
      typeof msg.data === 'object' &&
      'event' in msg.data
    ) {
      const event = msg.data as CfnDeploymentStackEvent;
      this.testingData.push({
        code: msg.code,
        message: msg.message,
        data: event,
      });
    }

    if (
      msg.code === 'CDK_TOOLKIT_I5000' ||
      msg.message.includes('Failed resources')
    ) {
      console.log(JSON.stringify(this.testingData, null, 2));
    }

    return Promise.resolve();
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
        msg.data.sdkLevel === 'info'
      ) {
        (msg?.data as any).content.forEach(
          (trace: { clientName: any; commandName: any }) => {
            this.printer.log(
              `AWS SDK Call ${trace.clientName}: ${trace.commandName}`,
              LogLevel.DEBUG
            );
          }
        );
      } else {
        this.printer.log(
          `[${msg.action}: ${msg.code}] ${msg.message}`,
          LogLevel.DEBUG
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
            : 'Green'
        )}] ${format.note(
          msg.time.toLocaleTimeString()
        )} ${msg.message.trim()} ${
          msg.data ? JSON.stringify(msg.data, null, 2) : ''
        }`,
        LogLevel.DEBUG
      );
    }
    return Promise.resolve();
  };

  amplifyNotifications = async <T>(
    msg: AmplifyIoHostEventMessage<T>
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
      case 'AMPLIFY_CFN_PROGRESS_UPDATE':
        if (!this.printer.isSpinnerRunning()) {
          this.printer.startSpinner('Deployment in progress...');
        }
        this.printer.updateSpinner({ prefixText: msg.message });
        return;
    }
    this.printer.log(
      msg.level === 'result'
        ? `${format.success('✔')} ${msg.message}`
        : msg.level === 'error'
        ? format.error(msg.message)
        : msg.message
    );
  };

  cdkDeploymentProgress = async <T>(
    msg: AmplifyIoHostEventMessage<T>
  ): Promise<void> => {
    // TBD: This will be replaced with a proper marker event with a unique code later
    // Asset publishing
    if (msg.message.includes('Checking for previously published assets')) {
      this.printer.startSpinner('Building and publishing assets...');
      return Promise.resolve();
    } else if (
      msg.message.includes('success: Published') ||
      msg.message.includes('0 still need to be published')
    ) {
      this.printer.stopSpinner();
      this.printer.log(`${format.success('✔')} Built and published assets`);
      return Promise.resolve();
    }

    // Hot swap deployment
    // TBD: This will be replaced with a proper marker event with a unique code later
    if (msg.message.includes('hotswapped')) {
      if (this.printer.isSpinnerRunning()) {
        this.printer.stopSpinner();
        this.printer.log(msg.message);
        this.printer.startSpinner('Deployment in progress...');
      } else {
        this.printer.log(msg.message);
      }
    }
  };

  /**
   * Displays pretty print of cfn deployment progress. Disabled if debug logging is turned on
   * @param msg a CDK event
   */
  fancyCfnDeploymentProgress = async <T>(
    msg: AmplifyIoHostEventMessage<T>
  ): Promise<void> => {
    // Start deployment progress display
    // TBD: This will be replaced with a proper marker event with a unique code later
    if (
      (msg.message.includes('deploying...') ||
        msg.message.includes('destroying..')) &&
      !this.cfnDeploymentProgressLogger
    ) {
      this.cfnDeploymentProgressLogger = new CfnDeploymentProgressLogger({
        resourceTypeColumnWidth: 30, // TBD
        getBlockWidth: () =>
          this.printer.stdout instanceof WriteStream
            ? this.printer.stdout.columns
            : 600,
        getBlockHeight: () =>
          this.printer.stdout instanceof WriteStream
            ? this.printer.stdout.rows
            : 100,
      });
      this.printer.startSpinner('Deployment in progress...', {
        timeoutSeconds: 300,
      });
    }

    // Stop deployment progress display
    if (
      msg.code === 'CDK_TOOLKIT_I5503' ||
      msg.message.includes('Failed resources')
    ) {
      // TBD: This will be replaced with a proper marker event with a unique code later
      if (this.cfnDeploymentProgressLogger) {
        await this.cfnDeploymentProgressLogger.finalize();
        this.printer.stopSpinner();
        this.cfnDeploymentProgressLogger = undefined;
      }
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
          } seconds`
        );
      }
      if (
        this.outputs &&
        'awsAppsyncApiEndpoint' in this.outputs &&
        this.outputs.awsAppsyncApiEndpoint
      ) {
        this.printer.log(
          `AppSync API endpoint = ${format.link(
            this.outputs.awsAppsyncApiEndpoint as string
          )}`
        );
      }
    }

    // CFN Outputs we care about. CDK_TOOLKIT_I5900 code represents outputs message
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

    if (
      msg.code === 'CDK_TOOLKIT_I5502' &&
      msg.data &&
      typeof msg.data === 'object' &&
      'event' in msg.data
    ) {
      const event = msg.data as CfnDeploymentStackEvent;
      this.cfnDeploymentProgressLogger?.addActivity(event);
    }

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
    msg: AmplifyIoHostEventMessage<T>
  ): Promise<void> => {
    // TBD, remove this code duplication

    // Stop deployment progress display
    if (
      msg.code === 'CDK_TOOLKIT_I5000' ||
      msg.message.includes('Failed resources')
    ) {
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
          } seconds`
        );
      }
      if (
        this.outputs &&
        'awsAppsyncApiEndpoint' in this.outputs &&
        this.outputs.awsAppsyncApiEndpoint
      ) {
        this.printer.log(
          `AppSync API endpoint = ${format.link(
            this.outputs.awsAppsyncApiEndpoint as string
          )}`
        );
      }
    }

    // CFN Outputs we care about. CDK_TOOLKIT_I5900 code represents outputs message
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

    if (msg.code === 'CDK_TOOLKIT_I5502') {
      // CDKs formatted cfn deployment progress
      this.printer.log(msg.message);
    }
  };
}
