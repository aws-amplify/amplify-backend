// The framework adapters (Next.js, Nitro, Nuxt, Astro, SPA/static) and the
// framework-detection/registry helpers now live in `@aws-blocks/hosting`.
// This module re-exports them so `@aws-amplify/hosting/adapters` keeps its
// public API while the implementation is owned by aws-blocks.
export {
  spaAdapter,
  nextjsAdapter,
  nitroAdapter,
  nuxtAdapter,
  astroAdapter,
  readProjectDeps,
  readProjectDepsStrict,
  detectFramework,
  getAdapter,
} from '@aws-blocks/hosting/adapters';
export type {
  SpaAdapterOptions,
  NextjsAdapterOptions,
  NitroAdapterOptions,
  NuxtAdapterOptions,
  AstroAdapterOptions,
  FrameworkAdapterFn,
} from '@aws-blocks/hosting/adapters';
