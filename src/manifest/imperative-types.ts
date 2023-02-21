import { randomUUID } from 'crypto';

export type EventHandler = {
  _eventHandler: true;
  id: string;
  // eventHandler: () => EventHandlerTuple;
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
  triggers?: EventSources extends string ? Record<EventSources, EventHandler> | undefined : undefined;
  runtimeAccess?: RuntimeRoles extends string ? Record<RuntimeRoles, PermissionTuple<string, string>[]> | undefined : undefined;
};

/**
 * Base class for resource configuration
 */
export abstract class AmplifyConfigBase<ResourceDef, Actions extends string, Scopes extends string = never>
  implements AccessGranter<Actions, Scopes>
{
  public readonly props: ResourceDef;
  public readonly id: string;
  public readonly providerName: string;
  private permissionTuple: PermissionTuple<Actions, Scopes>;

  constructor(providerName: string) {
    this.providerName = providerName;
    this.id = randomUUID();
    this.resetPermissions();
  }

  actions(...actions: Actions[]): this {
    this.permissionTuple.actions = actions;
    return this;
  }

  scopes(...scopes: Scopes[]): this {
    this.permissionTuple.scopes = scopes;
    return this;
  }

  grant() {
    const result = this.permissionTuple;
    this.resetPermissions();
    return result;
  }

  private resetPermissions() {
    this.permissionTuple = {
      resourceId: this.id,
      actions: [],
      scopes: [],
    };
  }
}
