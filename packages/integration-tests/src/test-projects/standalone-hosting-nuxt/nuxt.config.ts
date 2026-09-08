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
  },
});
