/* eslint-disable @typescript-eslint/no-explicit-any */
import { IoMessage } from '@aws-cdk/toolkit';
import { LogLevel } from '../printer/printer.js';
import { minimumLogLevel, printer } from '../printer.js';
import { format } from '../format/format.js';
import { CurrentActivityPrinter } from './cfn-deployment-progress/cfn_deployment_logger.js';
import { StackEvent } from '@aws-sdk/client-cloudformation';

/**
 * CDK event logger class
 */
export class CDKEventLogger {
  private printer = printer; // default stdout
  private enableColors = true; // show colors on console but not while writing to files
  private cfnDeploymentActivityPrinter: CurrentActivityPrinter | undefined;
  private outputs = {};
  private startTime: number;

  /**
   * a logger instance to be used for CDK events
   */
  constructor() {}

  getCDKEventLoggers = () => {
    return {
      notify:
        minimumLogLevel === LogLevel.DEBUG
          ? [this.debug]
          : [this.cfnDeploymentProgress],
    };
  };

  /**
   * Log debug messages
   */
  debug = <T>(msg: IoMessage<T>): Promise<void> => {
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
              `SDK Call ${trace.clientName}: ${trace.commandName}`
            );
          }
        );
      } else {
        this.printer.log(msg.message, LogLevel.DEBUG);
      }
    } else {
      if (this.enableColors) {
        this.printer.print(
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
          }`
        );
      } else {
        this.printer.log(
          `[${msg.action}: ${
            msg.code
          }] ${msg.time.toLocaleTimeString()} ${msg.message.trim()}`
        );
      }
      // console.log(msg);
    }
    return Promise.resolve();
  };

  /**
   * Displays pretty print of cfn deployment progress. Disabled if debug logging is turned on
   * @param msg a CDK event
   */
  cfnDeploymentProgress = async <T>(msg: IoMessage<T>): Promise<void> => {
    // TBD: This will be replaced with a proper marker event with a unique code later
    if (
      msg.message.includes('Deployment time') ||
      msg.message.includes('Failed resources')
    ) {
      if (this.cfnDeploymentActivityPrinter) {
        await this.cfnDeploymentActivityPrinter.stop();
        this.cfnDeploymentActivityPrinter = undefined;
      }
      if (
        this.outputs &&
        'awsAppsyncApiEndpoint' in this.outputs &&
        this.outputs.awsAppsyncApiEndpoint
      ) {
        this.printer.print(
          `AppSync API endpoint = ${format.success(
            this.outputs.awsAppsyncApiEndpoint as string
          )}`
        );
      }
      return Promise.resolve();
    }

    // TBD: This will be replaced with a proper marker event with a unique code later
    if (
      msg.message.includes('deploying...') &&
      !this.cfnDeploymentActivityPrinter
    ) {
      this.printer.print(format.note('Starting deployment...'));
      this.cfnDeploymentActivityPrinter = new CurrentActivityPrinter({
        resourceTypeColumnWidth: 30, // TBD
        stream: process.stdout,
      });
      this.startTime = Date.now();
      this.cfnDeploymentActivityPrinter.start();
    }

    // Hot swap deployment
    // TBD: This will be replaced with a proper marker event with a unique code later
    if (msg.message.includes('hotswapped')) {
      this.printer.print(msg.message);
    }

    // Outputs we care about. CDK_TOOLKIT_I5900 code represents outputs message
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

    // // For actual progress we need
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
