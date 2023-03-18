import { randomUUID } from 'crypto';
import { InputSchema } from '../providers/lambda/lambda-provider';
import { ConstructConfig, RuntimeAccessConfig, TriggerConfig } from './ir-definition';

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
  Actions extends string,
  Scopes extends string = never
> {
  protected readonly props: Config;
  protected readonly id: string;
  protected readonly providerName: string;
  protected readonly triggers: TriggerConfig = {};
  protected readonly runtimeAccess: RuntimeAccessConfig = {};

  protected permissionTuple: PermissionTuple<Actions, Scopes>;

  constructor(providerName: string) {
    this.providerName = providerName;
    this.id = randomUUID();
    this.resetPermissions();
  }

  on(eventName: Event, callback: AmplifyFunction | Function): this {
    if (callback instanceof AmplifyFunction) {
      this.triggers[eventName] = callback.id;
    } else {
      // serialize function
    }
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

  actions(...actions: Actions[]) {}

  private resetPermissions() {
    this.permissionTuple = {
      resourceId: this.id,
      actions: [],
      scopes: [],
    };
  }

  async _build(): Promise<ConstructConfig>;
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

export class AmplifyFunction extends AmplifyBuilderBase<InputSchema, never, 'executionRole', 'invoke'> {
  protected name?: string;
  constructor(public readonly props: InputSchema) {
    super('@aws-amplify/function-adaptor');
  }
}
