import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IPolicy } from 'aws-cdk-lib/aws-iam';
import { IResource } from 'aws-cdk-lib';

export type AmplifyContext = {
  getScope(): Construct;
};

export type AmplifyConstruct<
  Event extends string | undefined = string,
  Role extends string | undefined = string,
  Action extends string = string,
  Scope extends string = string,
  Resources extends Record<string, IResource> = Record<string, IResource>,
  HasHandler extends boolean = false
> = {
  onCloudEvent(event: Event, handler: IFunction): this;
  grant(role: Role, policy: IPolicy): this;
  actions(actions: Action[], scopes?: Scope[]): IPolicy;
  resources: Resources;
  // we can do something like this for other methods that only exist on some implementations
} & (HasHandler extends true ? { handle(): IFunction } : Record<string, never>);

export type WithOverride<Resources> = {
  override?(resources: Resources): void;
};

export type FeatureBuilder<
  Props extends string = string,
  Event extends string | undefined = string,
  Role extends string | undefined = string,
  Action extends string = string,
  Scope extends string = string,
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
