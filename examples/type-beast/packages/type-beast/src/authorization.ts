// Warning! Slightly different patterns herein, given the slightly different invocation
// style for auth, and the branching matrix of sometimes-overlapping options.

export const __data = Symbol('data');

/**
 * All possible providers.
 *
 * This list should not be used if you need to restrict available providers
 * according to an auth strategcy. E.g., `public` auth can only be facilitated
 * by `apiKey` and `iam` providers.
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

export const Strategies = [
  'public',
  'private',
  'owner',
  'groups',
  'custom',
] as const;
export type Strategy = (typeof Strategies)[number];

/**
 * The operations that can be performed against an API.
 */
export const Operations = [
  'create',
  'update',
  'delete',
  'read',
  'get',
  'list',
  'sync',
  'listen',
  'search',
] as const;
export type Operation = (typeof Operations)[number];

// type ImpliedFields<Fields extends string> = Record<
//   Fields,
//   any
// >;

type Shape = Record<string, any>;

export type Authorization<Deps extends Shape = {}> = {
  [__data]: {
    strategy?: Strategy;
    provider?: Provider;
    operations?: Operation[];
    groupOrOwnerField?: string;
    groups?: string[];
    multiOwner: boolean;
    identityClaim?: string;
    groupClaim?: string;
    dependencies: Deps;
  };
};

export type OwnerField = {};

/**
 * Creates a shallow copy of an object with an individual field pruned away.
 *
 * @param original The original object to prune.
 * @param without The field to prune.
 * @returns The pruned object.
 */
function omit<T extends {}, O extends string>(
  original: T,
  without: O
): Omit<T, O> {
  const pruned = { ...original };
  delete (pruned as any)[without];
  return pruned;
}

function to<SELF extends Authorization<any>>(
  this: SELF,
  operations: Operation[]
) {
  (this as any)[__data].operations = operations;
  return omit(this, 'to');
}

function inField<SELF extends Authorization<any>>(this: SELF, field: string) {
  (this as any)[__data].groupOrOwnerField = field;
  return omit(this, 'inField');
}

/**
 * Specifies a property of the identity JWT to use in place of `sub::username`
 * as the value to match against the owner field for authorization.
 *
 * @param this Authorization object to operate against.
 * @param property A property of identity JWT.
 * @returns A copy of the Authorization object with the claim attached.
 */
function identityClaim<SELF extends Authorization<any>>(
  this: SELF,
  property: string
) {
  (this as any)[__data].identityClaim = property;
  return omit(this, 'identityClaim');
}

function withClaimIn<SELF extends Authorization<any>>(
  this: SELF,
  property: string
) {
  (this as any)[__data].groupClaim = property;
  return omit(this, 'withClaimIn');
}

function validateProvider(
  needle: Provider | undefined,
  haystack: readonly Provider[]
) {
  if (needle && !haystack.includes(needle)) {
    throw new Error(`Invalid provider (${needle}) given!`);
  }
}

function authData(
  defaults: Partial<Authorization<{ owner: OwnerField }>[typeof __data]>
): Authorization<{ owner: OwnerField }> {
  return {
    [__data]: {
      strategy: 'public',
      provider: undefined,
      operations: undefined,
      groupOrOwnerField: undefined,
      multiOwner: false,
      identityClaim: undefined,
      groups: undefined,
      ...defaults,

      // might not even be needed ...
      dependencies: {
        owner: {},
      },
    },
  };
}

export const allow = {
  public(provider?: PublicProvider) {
    validateProvider(provider, PublicProviders);
    return {
      ...authData({
        strategy: 'public',
        provider,
      }),
      to,
    };
  },

  private(provider?: PrivateProvider) {
    validateProvider(provider, PrivateProviders);
    return {
      ...authData({
        strategy: 'private',
        provider,
      }),
      to,
    };
  },

  owner(provider?: OwnerProviders) {
    validateProvider(provider, OwnerProviders);
    return {
      ...authData({
        strategy: 'owner',
        provider,
      }),
      to,
      inField,
      identityClaim,
    };
  },

  /**
   * Specifies `owner` auth and automatically adds the necessary
   * `[owner]: a.string().list()` field if it doesn't already exist.
   */
  multipleOwners(provider?: OwnerProviders) {
    validateProvider(provider, OwnerProviders);
    return {
      ...authData({
        strategy: 'owner',
        multiOwner: true,
        provider,
      }),
      to,
      inField,
      identityClaim,
    };
  },

  specificGroup(group: string, provider?: GroupProvider) {
    return {
      ...authData({
        strategy: 'groups',
        multiOwner: true,
        provider,
        groups: [group],
      }),
      to,
      inField,
      withClaimIn,
    };
  },

  specificGroups(groups: string[], provider?: GroupProvider) {
    return {
      ...authData({
        strategy: 'groups',
        multiOwner: true,
        provider,
        groups,
      }),
      to,
      inField,
      withClaimIn,
    };
  },

  groupDefinedIn(groupsField: string, provider?: GroupProvider) {
    return {
      ...authData({
        strategy: 'groups',
        provider,
        groupOrOwnerField: groupsField,

        // just explicit here for clarity/distinction from plural version.
        multiOwner: false,
      }),
      to,
    };
  },

  groupsDefinedIn(groupsField: string, provider?: GroupProvider) {
    return {
      ...authData({
        strategy: 'groups',
        provider,
        groupOrOwnerField: groupsField,
        multiOwner: true,
      }),
      to,
    };
  },
} as const;
