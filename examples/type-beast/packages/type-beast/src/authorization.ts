import { UnionToIntersection } from './util';

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
  [K in keyof T as T extends Function ? K : never]: T[K];
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
  isMulti extends boolean = false
>(
  defaults: Partial<Authorization<Field, isMulti>[typeof __data]>
): Authorization<Field, isMulti> {
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
        provider,
        groups: [group],
      }),
      to,
      withClaimIn,
    };
  },

  specificGroups(groups: string[], provider?: GroupProvider) {
    return {
      ...authData({
        strategy: 'groups',
        provider,
        groups,
      }),
      to,
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

// these are correct.
const authA = authData({});
const authB = authData({ groupOrOwnerField: 'other' });
const authC = authData({ groupOrOwnerField: 'whoever', multiOwner: true });

// these are correct.
type TestAuthA = ImpliedAuthField<typeof authA>;
type TestAuthB = ImpliedAuthField<typeof authB>;
type TestAuthC = ImpliedAuthField<typeof authC>;

// this is expected, but perhaps not strictly "correct", as
// there isn't necessarily an `owner` field for public auth ... maybe OK though???
const builtA = allow.public();
type TestBuiltA = ImpliedAuthField<typeof builtA>;

// works as expected.
const builtB = allow.owner().inField('otherfield');
type TestBuiltB = ImpliedAuthField<typeof builtB>;

// works as expected.
const builtC = allow.multipleOwners().inField('editors');
type TestBuiltC = ImpliedAuthField<typeof builtC>;

const rules = [builtA, builtB, builtC];
type AuthTypes = ImpliedAuthField<(typeof rules)[number]>;
type TestRules = UnionToIntersection<AuthTypes>;

type ImpliedAuthField<T extends Authorization<any, any>> =
  T extends Authorization<infer Field, infer isMulti>
    ? Field extends string
      ? isMulti extends true
        ? Record<Field, string[]>
        : Record<Field, string>
      : never
    : never;

function compilerules<T extends Authorization<any, any>>(
  rules: T[]
): UnionToIntersection<ImpliedAuthField<T>> {
  return {} as any;
}

// works ... i think.
const x = compilerules(rules);

// type NormalizedOwnerField<T extends Authorization> =
//   T[typeof __data]['groupOrOwnerField'] extends string
//     ? T[typeof __data]['groupOrOwnerField']
//     : 'owner';

// type Test = AuthFieldType<(typeof x)[1]>;

// type AuthFields<T extends Array<Authorization<any, any>>> = {
//   [K in T[number]]: AuthFieldType<T[number]>
// };

// type T = AuthFields<typeof x>;
