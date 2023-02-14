import { randomUUID } from 'crypto';

type EventSource<Base, EventNames extends string> = Base & {
  triggers?: Record<EventNames, EventHandlerTuple>;
};

type EventHandlerTuple = {
  _eventHandler: true;
  id: string;
};

type EventHandler = {
  eventHandler: () => EventHandlerTuple;
};

type RuntimeAccess<Base, RuntimeRole extends string> = Base & {
  runtimeAccess?: Record<RuntimeRole, PermissionTuple<string, string>[]>;
};

type PermissionTuple<Actions extends string, Scopes extends string> = {
  resourceId: string;
  actions: Actions[];
  scopes: Scopes[];
};

type AccessGranter<Actions extends string, Scopes extends string = never> = {
  actions: (...actions: Actions[]) => AccessGranter<Actions, Scopes>;
  scopes: (...scopes: Scopes[]) => AccessGranter<Actions, Scopes>;
  grant: () => PermissionTuple<Actions, Scopes>;
};

/**
 * Base class for resource configuration
 */
export abstract class AmplifyConfigBase<Params, Actions extends string, Scopes extends string = never> implements AccessGranter<Actions, Scopes> {
  readonly params: Params;
  readonly id: string;
  private permissionTuple: PermissionTuple<Actions, Scopes>;

  constructor() {
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

/**
 * Types and class for DynamoDB table
 */
type NoSQLTablePropsBase = {
  primaryKey: {
    name: string;
    type: 'S' | 'N';
  };
  sortKey: {
    name: string;
    type: 'S' | 'N';
  };
  readCapacity: number;
  writeCapacity: number;
};
type CRUDLActions = 'create' | 'read' | 'update' | 'delete' | 'list';
type NoSQLTableProps = EventSource<NoSQLTablePropsBase, 'stream'>;
type NoSQLActions = CRUDLActions;
class AmplifyNoSQLTable extends AmplifyConfigBase<NoSQLTableProps, NoSQLActions> {
  constructor(readonly props: NoSQLTableProps) {
    super();
  }
}
export const NoSQLTable = (props: NoSQLTableProps) => new AmplifyNoSQLTable(props);

/**
 * Types and class for Lambda
 */
type LambdaPropsBase = {
  handler: string;
  runtime: string;
  codePath: string;
};
type LambdaProps = RuntimeAccess<LambdaPropsBase, 'lambdaRuntime'>;
type LambdaActions = 'invoke';
class AmplifyLambda extends AmplifyConfigBase<LambdaProps, LambdaActions> implements EventHandler {
  constructor(readonly props: LambdaProps) {
    super();
  }

  eventHandler() {
    return {
      _eventHandler: true as true,
      id: this.id,
    };
  }
}
export const Function = (props: LambdaProps) => new AmplifyLambda(props);

/**
 * Types and class for S3 bucket
 */
type FileStorageBase = {
  enforceSSL: boolean;
  bpa: boolean;
};
type FileStorageProps = EventSource<FileStorageBase, 'stream'>;
type FileStorageActions = CRUDLActions;
type FileStorageScopes = string;
class AmplifyFileStorage extends AmplifyConfigBase<FileStorageProps, FileStorageActions, FileStorageScopes> {
  constructor(readonly props: FileStorageProps) {
    super();
  }
}
export const FileStorage = (props: FileStorageProps) => new AmplifyFileStorage(props);
