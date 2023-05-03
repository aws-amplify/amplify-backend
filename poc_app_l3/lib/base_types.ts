import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IResource } from 'aws-cdk-lib';

export type AmplifyContext = {
  getScope(): Construct;
};

export type WithOverride<Resources> = {
  override?(resources: Resources): void;
};

export type WithAccess<Scope, Action> = {
  access?: Partial<
    Record<
      Scope,
      {
        allow: RuntimeEntityResolver | DefaultRuntimeEntityBuilder;
        actions: Action[];
      }[]
    >
  >;
};

type FunctionBuilder = ConstructBuilder<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  true, // builder that builds an IFunction
  unknown
>;
type DefaultRuntimeEntityBuilder = ConstructBuilder<
  string,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  true // HasDefaultRuntimeEntity
>;

export type WithEvents<Event extends string> = {
  events?: Partial<Record<Event, FunctionBuilder>>;
};

export type RuntimeEntity = {
  role: IRole;
  discriminant?: string;
};

export type RuntimeEntityResolver = (
  ctx: AmplifyContext,
  name: string
) => RuntimeEntity;

export type ConstructBuilder<
  RuntimeEntityName extends string | never = never,
  Event extends string | never = never,
  Action extends string | never = never,
  Scope extends string | never = never,
  Resources extends Record<string, IResource> = Record<string, IResource>,
  IsHandler extends boolean = false,
  HasDefaultRuntimeEntity extends boolean = false
> = {
  build(
    ctx: AmplifyContext,
    name: string
  ): AmplifyConstruct<
    RuntimeEntityName,
    Event,
    Action,
    Scope,
    Resources,
    IsHandler,
    HasDefaultRuntimeEntity
  >;
}; // & MaybeRuntimeEntityResolver<RuntimeEntityName, HasDefaultRuntimeEntity>;

export type GeneratedConfig<Config extends Record<string, ConstructBuilder>> = {
  [K in keyof Config as string]: ReturnType<Config[K]>;
};

export type Compose<Config extends Record<string, ConstructBuilder>> = {
  [K in keyof Config]: Omit<ReturnType<Config[K]>, 'resources'>;
};

export type Unwrap<Config extends Record<string, ConstructBuilder>> = {
  [K in keyof Config]: ReturnType<Config[K]>['resources'];
};

// these two types are the ones that drive the typings for the compose and custom callbacks
export type AmplifyCompose<Config extends Record<string, ConstructBuilder>> = (
  features: Compose<Config>
) => void;

export type AmplifyCustom<Config extends Record<string, ConstructBuilder>> = (
  featureResources: Unwrap<Config>,
  scope: Construct
) => void;

export type AmplifyConstruct<
  RuntimeEntityName extends string | never,
  Event extends string | never,
  Action extends string | never,
  Scope extends string | never,
  Resources extends Record<string, IResource>,
  IsFunction extends boolean,
  HasDefaultRuntimeEntity extends boolean
> = Resources &
  MaybeRuntimeEntitySupplier<RuntimeEntityName, HasDefaultRuntimeEntity> &
  MaybeTriggerSetter<Event> &
  MaybePermissionGranter<Action, Scope> &
  MaybeFunction<IsFunction>;

export type MaybeRuntimeEntityResolver<
  RuntimeEntityName,
  HasDefaultRuntimeEntity
> = HasDefaultRuntimeEntity extends true
  ? Record<string, never>
  : RuntimeEntityName extends string
  ? Record<RuntimeEntityName, RuntimeEntityResolver>
  : Record<string, never>;

export type MaybeRuntimeEntitySupplier<
  RuntimeEntityName extends string | never,
  HasDefaultRuntimeEntity extends boolean
> = RuntimeEntityName extends infer R extends string
  ? HasDefaultRuntimeEntity extends true
    ? { supplyRuntimeEntity(runtimeEntityName?: R): RuntimeEntity }
    : { supplyRuntimeEntity(runtimeEntityName: R): RuntimeEntity }
  : Record<string, never>;

export type MaybeTriggerSetter<Event extends string | never> =
  Event extends infer E extends string
    ? {
        setTrigger(eventName: E, handler: IFunction): void;
      }
    : Record<string, never>;

export type MaybePermissionGranter<
  Action extends string | never,
  Scope extends string | never
> = Action extends infer A extends string
  ? {
      grant(entity: RuntimeEntity, actions: A[], scope: Scope): void;
    }
  : Record<string, never>;

type MaybeFunction<IsFunction> = IsFunction extends true
  ? IFunction
  : Record<string, never>;
