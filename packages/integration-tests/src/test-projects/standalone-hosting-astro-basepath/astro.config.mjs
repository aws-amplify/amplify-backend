import { defineConfig } from 'astro/config';

// No `adapter:` — the Amplify Astro adapter installs `@astrojs/node`
// (--no-save) and force-merges `mode: 'standalone'` + `vite.ssr.noExternal:
// true` via a hidden config bridge during the build. Configuring
// @astrojs/node here would skip the bridge and the bundle would be
// missing transitively-required deps at runtime (Lambda 502).
export default defineConfig({
  output: 'server',
  // G1: manifest.basePath end-to-end. CloudFront should prefix every
  // behavior with /app and 308-redirect the bare domain root to /app/.
  base: '/app',
  // G2: trailing-slash canonical redirects. /app/about should
  // 308-redirect to /app/about/; /app/about/ should serve directly.
  trailingSlash: 'always',
  // Astro 5 defaults `security.checkOrigin: true`, which rejects every
  // non-GET request whose `Origin` header doesn't match `url.origin`.
  // Behind LWA the standalone server's `url.origin` resolves to
  // `http://localhost:3000`, so any browser/test fetch sees a 403
  // "Cross-site <METHOD> form submissions are forbidden" before it
  // reaches the user's route handler. Disable the check for this
  // fixture so the deployment test's POST probes return 200.
  // (Production customer apps that need CSRF protection should keep
  // the default on AND wire the original Host through — e.g. via a
  // reverse-proxy-aware @astrojs/node config — so url.origin rebuilds
  // from the X-Forwarded-Host header.)
  security: { checkOrigin: false },
  image: {
    // Astro's default sharp-based image service requires the native
    // `linux-x64-glibc` sharp binary at runtime, which is ~30 MB and
    // not bundleable through Vite's noExternal. Until the adapter
    // ships a separate image-opt Lambda (mirroring the Nuxt IPX
    // bundle), use the passthrough service so /_image is a no-op
    // rewrite. Required so the SSR Lambda boots without the sharp
    // dep — an Astro page that imports `astro:assets` fails at cold
    // start otherwise (`Could not find Sharp`).
    service: { entrypoint: 'astro/assets/services/noop' },
  },
});
