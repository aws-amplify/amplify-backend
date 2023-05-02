import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IPolicy } from 'aws-cdk-lib/aws-iam';
import { IResource } from 'aws-cdk-lib';

export type AmplifyContext = {
  getScope(): Construct;
};

type MaybeEventEmitter<Event> = Event extends infer E extends string
  ? {
      onCloudEvent(event: E, handler: IFunction): this;
    }
  : Record<string, never>;

type MaybeFunction<IsFunction> = IsFunction extends true
  ? IFunction
  : Record<string, never>;

export type AmplifyConstruct<
  Event extends string | never,
  Role extends string | never,
  Action extends string,
  Scope extends string,
  Resources extends Record<string, IResource> = Record<string, IResource>,
  IsHandler extends boolean
> = {
  grant(role: Role, policy: IPolicy): this;
  actions(actions: Action[], scopes?: Scope[]): IPolicy;
  resources: Resources;
  // we can do something like this for other methods that only exist on some implementations
} & MaybeFunction<IsHandler> &
  MaybeEventEmitter<Event>;

export type WithOverride<Resources> = {
  override?(resources: Resources): void;
};

export type WithEvents<Event extends string> = {
  events?: Partial<
    Record<
      Event,
      ReturnType<
        FeatureBuilder<
          unknown,
          unknown,
          unknown,
          unknown,
          unknown,
          unknown,
          true
        >
      >
    >
  >;
};

export type FeatureBuilder<
  Props extends object = object,
  Event extends string | never = never,
  Role extends string | never = never,
  Action extends string | never = never,
  Scope extends string | never = never,
  Resources extends Record<string, IResource> = Record<string, IResource>,
  HasHandler extends boolean = false
> = (
  props: Props
) => (
  ctx: AmplifyContext,
  name: string
) => AmplifyConstruct<Event, Role, Action, Scope, Resources, HasHandler>;

export type GeneratedConfig<Config extends Record<string, FeatureBuilder>> = {
  [K in keyof Config as string]: ReturnType<Config[K]>;
};

export type Compose<Config extends Record<string, FeatureBuilder>> = {
  [K in keyof Config]: Omit<ReturnType<Config[K]>, 'resources'>;
};

export type Unwrap<Config extends Record<string, FeatureBuilder>> = {
  [K in keyof Config]: ReturnType<Config[K]>['resources'];
};

// these two types are the ones that drive the typings for the compose and custom callbacks
export type AmplifyCompose<Config extends Record<string, FeatureBuilder>> = (
  features: Compose<Config>
) => void;

export type AmplifyCustom<Config extends Record<string, FeatureBuilder>> = (
  featureResources: Unwrap<Config>,
  scope: Construct
) => void;
