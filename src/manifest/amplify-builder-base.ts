import { randomUUID } from 'crypto';
import { z } from 'zod';
import { FunctionConfig } from '../providers/lambda/lambda-provider';
import { createHash } from 'crypto';
import path from 'path';
import { serializeFunction } from '@pulumi/pulumi/runtime';
import * as fs from 'fs-extra';
import { build } from 'esbuild';
import { BuildConfig, constructConfig, RuntimeAccessConfig, SecretConfig, TriggerConfig } from './ir-definition';

export type TriggerHandler = {
  triggerHandler: () => TriggerHandlerRef;
};

export type TriggerHandlerRef = {
  _refType: 'trigger';
  id: string;
};

export type PermissionTuple<Actions extends string, Scopes extends string> = {
  resourceId: string;
  actions: Actions[];
  scopes: Scopes[];
};

export type AccessGranter<Actions extends string, Scopes extends string = never> = {
  actions: (...actions: Actions[]) => AccessGranter<Actions, Scopes>;
  scopes: (...scopes: Scopes[]) => AccessGranter<Actions, Scopes>;
  grant: () => PermissionTuple<Actions, Scopes>;
};

export type ResourceDefinition<Props, EventSources extends string | undefined = undefined, RuntimeRoles extends string | undefined = undefined> = {
  props: Props;
  triggers?: EventSources extends string ? Record<EventSources, TriggerHandlerRef> | undefined : undefined;
  runtimeAccess?: RuntimeRoles extends string ? Record<RuntimeRoles, PermissionTuple<string, string>[]> | undefined : undefined;
};

/**
 * Base class for resource configuration
 */
export abstract class AmplifyBuilderBase<
  Config,
  Events extends string = string,
  RuntimeRoles extends string = string,
  Actions extends string = string,
  Scopes extends string = never
> {
  protected readonly id: string;

  protected readonly triggers: TriggerConfig = {};
  protected readonly runtimeAccess: RuntimeAccessConfig = {};
  protected readonly inlineConstructs: Record<string, Promise<BuildResult>> = {};
  protected readonly secrets: SecretConfig = {};
  protected buildConfig?: BuildConfig;

  constructor(protected readonly adaptor: string, protected readonly config: Config) {
    this.id = randomUUID();
  }

  /**
   * Configure a function to run when this construct produces an event
   * @param eventName The event to attach a function to
   * @param callback The function to execute on the event
   */
  eventHandler(eventName: Events, callback: IAmplifyFunction): this {
    this.triggers[eventName] = callback.id;
    return this;
  }

  /**
   * Alias to eventHandler that takes in a native callback function and wraps it in an AmplifyFunction
   * @param eventName
   * @param callback
   * @param callbackName
   * @returns
   */
  on(eventName: Events, callback: IAmplifyFunction | Function, callbackName?: string): this {
    if (typeof callback === 'function') {
      const amplifyFunction = InlineFunction(callback);
      callbackName = callbackName ?? `${eventName}Trigger`;
      const buildResult = amplifyFunction._build();
      this.inlineConstructs[callbackName] = buildResult;
      this.triggers[eventName] = amplifyFunction.id;
    } else {
      this.triggers[eventName] = callback.id;
    }
    return this;
  }

  grant(roleName: RuntimeRoles, policyBuilder: PolicyGrantBuilder): this {
    const policy = policyBuilder._build();
    if (!this.runtimeAccess[roleName]) {
      this.runtimeAccess[roleName] = {};
    }
    if (!this.runtimeAccess[roleName][policy.constructId]) {
      this.runtimeAccess[roleName][policy.constructId] = [];
    }
    this.runtimeAccess[roleName][policy.constructId].push({ actions: policy.actions, scopes: policy.scopes });
    return this;
  }

  actions(...actions: [Actions, ...Actions[]]): PolicyGrantBuilder<Actions, Scopes> {
    return new PolicyGrantBuilder(this.id, actions);
  }

  async _build(): Promise<BuildResult> {
    // await the promises for all of the inline constructs (aka callback functions)
    const resolvedInlineConstructEntries = await Promise.all(
      Object.entries(this.inlineConstructs).map(async ([name, configPromise]) => [name, await configPromise] as const)
    );
    const resolvedInlineConstructs = resolvedInlineConstructEntries.reduce(
      (accumulator, [name, config]) => ({ ...accumulator, [name]: config }),
      {} as Record<string, BuildResult>
    );
    return {
      id: this.id,
      config: {
        adaptor: this.adaptor,
        properties: this.config,
        triggers: this.triggers,
        runtimeAccess: this.runtimeAccess,
        secrets: this.secrets,
        build: this.buildConfig,
      },
      inlineConstructs: resolvedInlineConstructs,
    };
  }
}

export const buildResult = z.object({
  id: z.string(),
  config: constructConfig,
  inlineConstructs: z.record(
    z.object({
      config: constructConfig,
      id: z.string(),
    })
  ),
});

export type BuildResult = z.infer<typeof buildResult>;

export class PolicyGrantBuilder<Action extends string = string, Scope extends string = string> {
  private _scopes: Scope[] = [];

  constructor(private readonly constructId: string, private readonly actions: [Action, ...Action[]]) {}

  scopes(...scopes: Scope[]): this {
    this._scopes = scopes;
    return this;
  }
  _build(): PolicyGrant {
    return {
      constructId: this.constructId,
      actions: this.actions,
      scopes: this._scopes,
    };
  }
}

type PolicyGrant<Action extends string = string, Scope extends string = string> = {
  constructId: string;
  actions: [Action, ...Action[]];
  scopes?: Scope[];
};

export type IAmplifyFunction = AmplifyBuilderBase<FunctionConfig, never, 'runtime', 'invoke'>;

export class AmplifyFunction extends AmplifyBuilderBase<FunctionConfig, never, 'runtime', 'invoke'> {
  constructor(config: FunctionConfig) {
    super('@aws-amplify/function-adaptor', config);
  }
}

export class CallbackFunction extends AmplifyBuilderBase<Function, never, 'runtime', 'invoke'> {
  constructor(config: Function) {
    super('@aws-amplify/function-adaptor', config);
  }

  async _build(): Promise<BuildResult> {
    // serialize the function closure
    const serialized = await serializeFunction(this.config);
    const funcHash = createHash('md5').update(serialized.text).digest('hex');
    const tempFile = path.resolve(process.cwd(), 'temp-build.js');
    const bundlePath = path.join(process.cwd(), '.build', funcHash);
    const bundleNameBase = 'lambda-bundle';
    const bundleFile = path.join(bundlePath, `${bundleNameBase}.js`);
    await fs.writeFile(tempFile, serialized.text);
    await build({
      entryPoints: [tempFile],
      outfile: bundleFile,
      bundle: true,
      format: 'cjs',
      platform: 'node',
      external: ['aws-sdk'],
    });
    // esbuild places 'use strict' on the first line of the file which is incompatible with the serialized function
    const bundleContent = await fs.readFile(bundleFile, 'utf-8');
    const lines = bundleContent.split('\n');
    lines.shift();
    await fs.writeFile(bundleFile, lines.join('\n'), 'utf-8');

    // remove the temp file
    await fs.unlink(tempFile);
    const configFunc = new AmplifyFunction({
      handler: `${bundleNameBase}.${serialized.exportName}`,
      runtime: 'nodejs18.x',
      codePath: bundlePath,
    });
    return await configFunc._build();
  }
}

export const AFunction = (config: FunctionConfig) => new AmplifyFunction(config);

export const InlineFunction = (callback: Function) => new CallbackFunction(callback);
