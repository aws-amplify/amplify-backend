/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogLevel } from '../printer/printer.js';
import { minimumLogLevel, printer } from '../printer.js';
import { format } from '../format/format.js';
import { CurrentActivityPrinter } from './cfn-deployment-progress/cfn_deployment_logger.js';
import { StackEvent } from '@aws-sdk/client-cloudformation';
import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';

/**
 * CDK event logger class
 */
export class CDKEventLogger {
  private printer = printer; // default stdout
  private fancyOutput = true;
  private cfnDeploymentActivityPrinter: CurrentActivityPrinter | undefined;
  private outputs = {};
  private startTime: number;

  /**
   * a logger instance to be used for CDK events
   */
  constructor() {}

  getCDKEventLoggers = () => {
    if (minimumLogLevel === LogLevel.DEBUG) {
      return {
        notify: [this.debug],
      };
    }
    const loggers = [this.amplifyNotifications, this.cdkDeploymentProgress];
    if (this.fancyOutput) {
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
        this.printer.log(msg.message, LogLevel.DEBUG);
      }
    } else {
      if (this.fancyOutput) {
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
      } else {
        this.printer.log(
          `[${msg.action}: ${
            msg.code
          }] ${msg.time.toLocaleTimeString()} ${msg.message.trim()}`,
          LogLevel.DEBUG
        );
      }
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
      this.printer.log(msg.message);
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
      msg.message.includes('deploying...') &&
      !this.cfnDeploymentActivityPrinter
    ) {
      this.cfnDeploymentActivityPrinter = new CurrentActivityPrinter({
        resourceTypeColumnWidth: 30, // TBD
        stream: process.stdout,
      });
      this.startTime = Date.now();
      this.cfnDeploymentActivityPrinter.start();
    }

    // Stop deployment progress display
    if (
      msg.code === 'CDK_TOOLKIT_I5000' ||
      msg.message.includes('Failed resources')
    ) {
      // TBD: This will be replaced with a proper marker event with a unique code later
      if (this.cfnDeploymentActivityPrinter) {
        await this.cfnDeploymentActivityPrinter.stop();
        this.cfnDeploymentActivityPrinter = undefined;
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

    // For actual progress we need sdk call outputs, so for now, re are relying on cdk calls to sdk
    if (!this.isCfnSdkCallEvent(msg.data)) {
      return Promise.resolve();
    }

    // CFN Deployment progress
    const commandName = (msg?.data as any).content[0].commandName;
    if (commandName === 'DescribeStackEventsCommand') {
      const events = (msg.data as any).content[0].output.StackEvents as [];
      const reversedEvents = events.slice().reverse();
      reversedEvents.forEach((event: StackEvent) => {
        if (event.Timestamp && event.Timestamp.valueOf() >= this.startTime) {
          this.cfnDeploymentActivityPrinter?.addActivity(event);
        }
      });
      await this.cfnDeploymentActivityPrinter?.print({});
    } else if (commandName === 'GetTemplateCommand') {
      // TBD
    } else if (commandName === 'DescribeStacksCommand') {
      // TBD
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
    if (
      msg.message.includes('deploying...') &&
      !this.cfnDeploymentActivityPrinter
    ) {
      this.cfnDeploymentActivityPrinter = new CurrentActivityPrinter({
        resourceTypeColumnWidth: 30, // TBD
        stream: process.stdout,
      });
      this.startTime = Date.now();
      this.cfnDeploymentActivityPrinter.start();
    }

    // Stop deployment progress display
    if (
      msg.code === 'CDK_TOOLKIT_I5000' ||
      msg.message.includes('Failed resources')
    ) {
      // TBD: This will be replaced with a proper marker event with a unique code later
      if (this.cfnDeploymentActivityPrinter) {
        await this.cfnDeploymentActivityPrinter.stop();
        this.cfnDeploymentActivityPrinter = undefined;
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

    if (msg.code === 'CDK_TOOLKIT_I0000') {
      if (msg.message.split('|').length - 1 == 5) {
        // CDKs formatted cfn deployment progress
        this.printer.log(msg.message);
      }
    }
  };

  isCfnSdkCallEvent = <T>(data: T) => {
    return (
      this.isSdkCallEvent(data) &&
      (data as any).content[0].clientName === 'CloudFormationClient'
    );
  };

  isSdkCallEvent = <T>(data: T) => {
    return (
      data &&
      typeof data === 'object' &&
      'sdkLevel' in data &&
      data.sdkLevel === 'info' &&
      'content' in data &&
      Array.isArray(data.content) &&
      data.content.length > 0 &&
      'clientName' in data.content[0]
    );
  };
}
