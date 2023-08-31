// Warning! Slightly different patterns herein, given the slightly different invocation
// style for auth, and the branching matrix of sometimes-overlapping options.

type Shape = Record<string, any>;

const __data = Symbol('data');

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

export const Strategies = ['public', 'private', 'owner', 'groups', 'custom'];
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

function to<SELF extends AuthorizationFor<any>>(
  this: SELF,
  operations: Operation[]
) {
  (this as any)[__data].operations = operations;
  return omit(this, 'to');
}

function inField<SELF extends AuthorizationFor<any>>(
  this: SELF,
  field: keyof SELF[typeof __data]['shape']
) {
  (this as any)[__data].ownerField = field;
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
function identityClaim<SELF extends AuthorizationFor<any>>(
  this: SELF,
  property: string
) {
  (this as any)[__data].identityClaim = property;
  return omit(this, 'identityClaim');
}

function validateProvider(
  needle: Provider | undefined,
  haystack: readonly Provider[]
) {
  if (needle !== undefined && !haystack.includes(needle)) {
    throw new Error(`Invalid provider (${needle}) given!`);
  }
}

function defaultAuth<T extends Shape>(
  shape: T
): AuthorizationFor<T>[typeof __data] {
  return {
    strategy: 'public',
    provider: 'apiKey',
    operations: [...Operations],
    ownerField: 'owner',
    identityClaim: '',
    shape,
  };
}

export class AuthBuilder<T extends Shape> {
  constructor(private shape: T) {}

  public(provider?: PublicProvider) {
    validateProvider(provider, PublicProviders);
    return {
      [__data]: {
        ...defaultAuth(this.shape),
        strategy: 'public',
        provider,
      },
      to,
    };
  }
  private(provider?: PrivateProvider) {
    validateProvider(provider, PrivateProviders);
    return {
      [__data]: {
        ...defaultAuth(this.shape),
        strategy: 'private',
        provider,
      },
      to,
    };
  }
  owner(provider?: OwnerProviders) {
    validateProvider(provider, OwnerProviders);
    return {
      [__data]: {
        ...defaultAuth(this.shape),
        strategy: 'owner',
        provider,
      },
      to,
      inField,
      identityClaim,
    };
  }

  /**
   * Specifies `owner` auth and automatically creates the necessary
   * `[owner]: a.string().list()` field if it doesn't already exist.
   *
   * If the desired `[owner]` field already exists and is not the
   * correct type, an error will be thrown.
   */
  multipleOwners() {}
  specificGroup() {}
}

export type AuthorizationFor<T extends Shape> = {
  [__data]: {
    strategy?: Strategy;
    provider?: Provider;
    operations?: Operation[];
    ownerField?: keyof T | 'owner';
    identityClaim?: string;
    shape: T;
  };
};

export type AuthBuilderChain<T extends Shape> = (
  builder: AuthBuilder<T>
) => AuthorizationFor<T>[];

/**
 * SCRATCH
 */

const test = new AuthBuilder({ a: 'something', b: 'something else' });

const ownerAuth = test.owner();
const withTo = ownerAuth.to(['create', 'listen']);
withTo.inField('a');
