export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/image'],
  routeRules: {
    '/about': { prerender: true },
    '/swr': { swr: 10 },
    // Permanent redirect — exercised by stage 2b's redirect assertion.
    // Nitro's route rules support redirects but not rewrites, so the
    // Next.js fixture's rewrite test has no equivalent here.
    '/legacy-about': { redirect: { to: '/about', statusCode: 301 } },
  },
  nitro: {
    preset: 'aws-lambda',
    awsLambda: { streaming: true },
    // Work around nuxt/nuxt#36467: on Windows the Nitro externals plugin
    // resolves a backslash path for the Nuxt renderer and its inline-match
    // rule ('nuxt/dist') never matches backslashes, so the renderer is left
    // external and loads stub manifest/precomputed modules. Every SSR/
    // prerender render then throws "Either manifest or precomputed data must
    // be provided" and the build fails. Force-inlining the renderer fixes the
    // Windows build and is a no-op on Linux.
    externals: { inline: [/[\\/]node_modules[\\/]nuxt[\\/]dist[\\/]/] },
  },
});
