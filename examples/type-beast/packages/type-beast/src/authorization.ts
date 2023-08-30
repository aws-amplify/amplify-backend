// Warning! Slightly different patterns herein, given the slightly different invocation
// style for auth, and the branching matrix of sometimes-overlapping options.

/**
 * All possible providers.
 */
export const Providers = [
  'apiKey',
  'iam',
  'userPools',
  'oidc',
  'function',
] as const;
export type Provider = (typeof Providers)[number];

/**
 * The subset of auth providers that can facilitate `public` auth.
 */
export const PublicProviders = ['apiKey', 'iam'] as const;
export type PublicProvider = (typeof PublicProviders)[number];

/**
 * The subset of auth providers that can facilitate `private` auth.
 */
export const PrivateProviders = ['userPools', 'oidc', 'iam'] as const;
export type PrivateProvider = (typeof PrivateProviders)[number];

/**
 * The subset of auth providers that can facilitate `owner` auth.
 */
export const OwnerProviders = ['userPools', 'oidc'] as const;
export type OwnerProviders = (typeof OwnerProviders)[number];

/**
 * The subset of auth providers that can facilitate `group` auth.
 */
export const GroupProviders = ['userPools', 'oidc'] as const;
export type GroupProvider = (typeof GroupProviders)[number];

/**
 * The subset of auth providers that can facilitate `custom` auth.
 */
export const CustomProviders = ['function'] as const;
export type CustomProvider = (typeof CustomProviders)[number];

export const Strategies = ['public', 'private', 'owner', 'groups', 'custom'];
export type Strategy = (typeof Strategies)[number];

/**
 * The operations that can be performed against an API.
 */
export const Operations = [
  'create',
  'read',
  'update',
  'delete',
  'listen',
] as const;
export type Operation = (typeof Operations)[number];

type BuilderFunctions<T, Fields extends string = ''> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K] extends (
    ...args: infer ARGS
  ) => infer RT
    ? <_ extends Fields>(...args: ARGS) => RT
    : never;
};

function builder<Fields extends string = '', T extends {} = {}, O = unknown>(
  o: T,
  without?: O
): Omit<BuilderFunctions<T, Fields>, O extends string ? O : never> {
  return Object.fromEntries(
    Object.entries(o).filter(([k, v]) => k !== without)
  ) as any;
}

function to<Fields extends string, T extends {}>(
  this: T,
  operations: Operation[]
) {
  return builder<Fields>(
    {
      ...this,
      operations,
    },
    'to'
  );
}

const allow = {
  public(provider?: PublicProvider) {
    if (provider !== undefined && !PublicProviders.includes(provider as any)) {
      throw new Error(`Invalid provider (${provider}) given`);
    }
    const b = builder({
      strategy: 'public',
      provider,
      to,
    });
    return b;
  },
  private(provider?: PrivateProvider) {
    if (provider !== undefined && !PrivateProviders.includes(provider as any)) {
      throw new Error(`Invalid provider (${provider}) given`);
    }
    return builder({
      strategy: 'private',
      provider,
      to,
    });
  },
  owner() {},
  multipleOwners() {},
  specificGroup() {},
};

function allowBuilder() {}

// TODO: Refactor into types + proper builder.
// This is just here to prove that I'm *starting* to understand how things
// are wired together here...
export const authorization = {
  allow,
} as const;
