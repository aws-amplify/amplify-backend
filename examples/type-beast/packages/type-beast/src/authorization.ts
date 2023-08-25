export type TempAuthParam = any[];

export const Providers = [
  'apiKey',
  'iam',
  'userPools',
  'oidc',
  'function',
] as const;

type Provider = (typeof Providers)[number];

export const authorization = {
  allow: {
    public(provider?: Provider) {
      if (provider !== undefined && !Providers.includes(provider as any)) {
        throw new Error(`Invalid provider (${provider}) given`);
      }
      return {
        strategy: 'public',
        provider,
      };
    },
  },
};
