export type TempAuthParam = any[];

export const Providers = [
  'apiKey',
  'iam',
  'userPools',
  'oidc',
  'function',
] as const;

export type Provider = (typeof Providers)[number];

export const Operations = [
  'create',
  'read',
  'update',
  'delete',
  'listen',
] as const;

export type Operation = (typeof Operations)[number];

// TODO: Refactor into types + proper builder.
// This is just here to prove that I'm *starting* to understand how things
// are wired together here...
export const authorization = {
  allow: {
    public(provider?: Provider) {
      if (provider !== undefined && !Providers.includes(provider as any)) {
        throw new Error(`Invalid provider (${provider}) given`);
      }
      return {
        strategy: 'public',
        provider,
        to(operations: Operation[]) {
          return {
            strategy: this.strategy,
            provider: this.provider,
            operations,
          };
        },
      };
    },
  },
} as const;
