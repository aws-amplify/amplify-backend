import { randomUUID } from 'crypto';
import { IAmplifyFunction, InlineFunction } from './function-builder';
import { BuildConfig, ConstructConfig, ConstructMap, RuntimeAccessConfig, SecretConfig, TriggerConfig } from './ir-definition';

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
  Event extends string = string,
  RuntimeRoleName extends string = string,
  Action extends string = string,
  Scope extends string = never
> {
  protected readonly id: string;

  protected readonly triggers: TriggerConfig = {};
  protected readonly runtimeAccess: RuntimeAccessConfig = {};
  protected readonly inlineConstructs: ConstructMap = {};
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
  eventHandler(eventName: Event, callback: IAmplifyFunction): this {
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
  async on(eventName: Event, callback: IAmplifyFunction | Function, callbackName?: string): Promise<this> {
    if (typeof callback === 'function') {
      const amplifyFunction = await InlineFunction(callback);
      callbackName = callbackName ?? `${eventName}Trigger`;
      this.inlineConstructs[callbackName] = amplifyFunction._build().config;
      this.triggers[eventName] = amplifyFunction.id;
    } else {
      this.triggers[eventName] = callback.id;
    }
    return this;
  }

  grant(roleName: RuntimeRoleName, policyBuilder: PolicyGrantBuilder): this {
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

  actions(...actions: [Action, ...Action[]]): PolicyGrantBuilder<Action, Scope> {
    return new PolicyGrantBuilder(this.id, actions);
  }

  _build(): { config: ConstructConfig; inlineConstructs: ConstructMap } {
    return {
      config: {
        adaptor: this.adaptor,
        properties: this.config,
        triggers: this.triggers,
        runtimeAccess: this.runtimeAccess,
        secrets: this.secrets,
        build: this.buildConfig,
      },
      inlineConstructs: this.inlineConstructs,
    };
  }
}

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
