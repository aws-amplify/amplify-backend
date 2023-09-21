import { UnionToIntersection, Prettify } from './util';

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

export type Authorization<
  AuthField extends string | undefined,
  AuthFieldPlurality extends boolean
> = {
  [__data]: {
    strategy?: Strategy;
    provider?: Provider;
    operations?: Operation[];
    groupOrOwnerField?: AuthField;
    groups?: string[];
    multiOwner: AuthFieldPlurality;
    identityClaim?: string;
    groupClaim?: string;
  };
};

export type OwnerField = {};

type BuilderMethods<T extends {}> = {
  [K in keyof T as T[K] extends (...args: any) => any ? K : never]: T[K];
};

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

function to<SELF extends Authorization<any, any>>(
  this: SELF,
  operations: Operation[]
) {
  (this as any)[__data].operations = operations;
  return omit(this, 'to');
}

function inField<SELF extends Authorization<any, any>, Field extends string>(
  this: SELF,
  field: Field
) {
  this[__data].groupOrOwnerField = field;
  const built = omit(this, 'inField');

  return built as unknown as BuilderMethods<typeof built> &
    Authorization<Field, SELF[typeof __data]['multiOwner']>;
}

/**
 * Specifies a property of the identity JWT to use in place of `sub::username`
 * as the value to match against the owner field for authorization.
 *
 * @param this Authorization object to operate against.
 * @param property A property of identity JWT.
 * @returns A copy of the Authorization object with the claim attached.
 */
function identityClaim<SELF extends Authorization<any, any>>(
  this: SELF,
  property: string
) {
  this[__data].identityClaim = property;
  return omit(this, 'identityClaim');
}

function withClaimIn<SELF extends Authorization<any, any>>(
  this: SELF,
  property: string
) {
  this[__data].groupClaim = property;
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

function authData<
  Field extends string | undefined = 'owner',
  isMulti extends boolean = false,
  Builders extends {} = {}
>(
  defaults: Partial<Authorization<Field, isMulti>[typeof __data]>,
  builderMethods: Builders
): Authorization<Field, isMulti> & Builders {
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
      // dependencies: {
      //   owner: {},
      // },
    } as any,
    ...builderMethods,
  };
}

export const allow = {
  public(provider?: PublicProvider) {
    validateProvider(provider, PublicProviders);
    return authData(
      {
        strategy: 'public',
        provider,
      },
      {
        to,
      }
    );
  },

  private(provider?: PrivateProvider) {
    validateProvider(provider, PrivateProviders);
    return authData(
      {
        strategy: 'private',
        provider,
      },
      {
        to,
      }
    );
  },

  owner(provider?: OwnerProviders) {
    validateProvider(provider, OwnerProviders);
    return authData(
      {
        strategy: 'owner',
        provider,
      },
      {
        to,
        inField,
        identityClaim,
      }
    );
  },

  /**
   * Specifies `owner` auth and automatically adds the necessary
   * `[owner]: a.string().list()` field if it doesn't already exist.
   */
  multipleOwners(provider?: OwnerProviders) {
    validateProvider(provider, OwnerProviders);
    return authData(
      {
        strategy: 'owner',
        multiOwner: true,
        provider,
      },
      {
        to,
        inField,
        identityClaim,
      }
    );
  },

  specificGroup(group: string, provider?: GroupProvider) {
    return authData(
      {
        strategy: 'groups',
        provider,
        groups: [group],
      },
      {
        to,
        withClaimIn,
      }
    );
  },

  specificGroups(groups: string[], provider?: GroupProvider) {
    return authData(
      {
        strategy: 'groups',
        provider,
        groups,
      },
      {
        to,
        withClaimIn,
      }
    );
  },

  groupDefinedIn<T extends string>(groupsField: T, provider?: GroupProvider) {
    return authData(
      {
        strategy: 'groups',
        provider,
        groupOrOwnerField: groupsField,
      },
      {
        to,
      }
    );
  },

  groupsDefinedIn<T extends string>(groupsField: T, provider?: GroupProvider) {
    return authData(
      {
        strategy: 'groups',
        provider,
        groupOrOwnerField: groupsField,
        multiOwner: true,
      },
      {
        to,
      }
    );
  },
} as const;

/**
 * Turns the type from a list of `Authorization` rules like this:
 *
 * ```typescript
 * [
 *  allow.public(),
 *  allow.owner().inField('otherfield'),
 *  allow.multipleOwners().inField('editors')
 * ]
 * ```
 *
 * Into a union of the possible `fieldname: type` auth objects like this:
 *
 * ```typescript
 * {
 *  owner?: string | undefined;
 * } | {
 *  otherfield?: string | undefined;
 * } | {
 *  editors?: string[] | undefined;
 * }
 * ```
 */
export type ImpliedAuthField<T extends Authorization<any, any>> =
  T extends Authorization<infer Field, infer isMulti>
    ? Field extends string
      ? isMulti extends true
        ? { [K in Field]?: string[] }
        : { [K in Field]?: string }
      : {}
    : {};

/**
 * Turns the type from a list of `Authorization` rules like this:
 *
 * ```typescript
 * [
 *  allow.public(),
 *  allow.owner().inField('otherfield'),
 *  allow.multipleOwners().inField('editors')
 * ]
 * ```
 *
 * Into an object type that includes all auth fields like this:
 *
 * ```typescript
 * {
 *  owner?: string | undefined;
 *  otherfield?: string | undefined;
 *  editors?: string[] | undefined;
 * }
 * ```
 */
export type ImpliedAuthFields<T extends Authorization<any, any>> =
  UnionToIntersection<ImpliedAuthField<T>>;
