import { Command, createArgument, createOption } from '@commander-js/extra-typings';
import { configureAwsSdk } from '../configure-profile';
import { ConsoleLogger } from '../observability-tooling/amplify-logger';
import { IAmplifyLogger, IAmplifyMetrics } from '../types';
import * as sdk from 'aws-sdk';
import { AmplifyMetrics } from '../observability-tooling/amplify-metrics';

export const envNamePositional = createArgument('<envName>', 'The environment on which to perform the operation');
export const profileNameOption = createOption('-p, --profile <profile>', 'The AWs profile to use for credentials');
export const logLevelOption = createOption('--log-level <level>', 'The log level of output to print to the console');
export const nameOption = createOption('-n, --name <paramName...>', 'The name of the parameter to modify').makeOptionMandatory(true);
export const secretOption = createOption(
  '-s, --is-secret',
  'This value is a secret. Indicates that it should never be fetched on the client or printed'
).default(false);

export class StrictCommand extends Command {
  constructor(name?: string) {
    super(name);
    this.allowExcessArguments(false).allowUnknownOption(false);
  }
}

export type LoggerMixin = {
  log: IAmplifyLogger;
};

export const WithLogger = <TBase extends AbstractCtor>(Base: TBase): AbstractMixinResult<LoggerMixin, TBase> => {
  abstract class BaseWithLogger extends Base implements LoggerMixin {
    log: IAmplifyLogger;

    constructor(...args: any[]) {
      super(args);
      this.addOption(logLevelOption);
      this.hook('preAction', (_, actionCommand) => {
        this.log = new ConsoleLogger(actionCommand.opts()?.level as string);
      });
    }
  }
  return BaseWithLogger;
};

export type AwsSdkMixin = {
  sdk: typeof sdk;
};

export const WithAwsSdk = <TBase extends AbstractCtor>(Base: TBase): AbstractMixinResult<AwsSdkMixin, TBase> => {
  abstract class BaseWithAwsSdk extends Base implements AwsSdkMixin {
    sdk: typeof sdk;

    constructor(...args: any[]) {
      super(args);
      this.addOption(profileNameOption);
      this.hook('preAction', async (_, actionCommand) => {
        this.sdk = await configureAwsSdk(actionCommand.opts()?.profile as string | undefined);
      });
    }
  }
  return BaseWithAwsSdk;
};

export type MetricsMixin = {
  metrics: IAmplifyMetrics;
};
export const WithMetrics = <TBase extends AbstractCtor>(Base: TBase): AbstractMixinResult<MetricsMixin, TBase> => {
  abstract class BaseWithMetrics extends Base implements MetricsMixin {
    metrics: IAmplifyMetrics;

    constructor(...args: any[]) {
      super(args);
      this.metrics = new AmplifyMetrics();
    }
  }
  return BaseWithMetrics;
};

// don't try to understand, just beliee
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-2.html#abstract-construct-signatures
export type AbstractMixinResult<MixinInterface, TBase> = ((abstract new (...args: any[]) => MixinInterface) & { prototype: MixinInterface }) & TBase;

export type AbstractCtor<T extends Command = Command> = abstract new (...args: any[]) => T;

/**
 * Convenience export that includes metrics and logger out of the box
 */
export const AmplifyCommandBase = WithLogger(WithMetrics(StrictCommand));

/**
 * Convenience export that includes a configured aws sdk instance as well as the above
 */
export const CredentialedCommandBase = WithAwsSdk(AmplifyCommandBase);
