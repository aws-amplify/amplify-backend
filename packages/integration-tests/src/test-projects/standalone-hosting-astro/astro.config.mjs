import { defineConfig } from 'astro/config';

// No `adapter:` — the Amplify Astro adapter installs `@astrojs/node`
// (--no-save) and force-merges `mode: 'standalone'` + `vite.ssr.noExternal:
// true` via a hidden config bridge during the build. Configuring
// @astrojs/node here would skip the bridge and the bundle would be
// missing transitively-required deps at runtime (Lambda 502).
export default defineConfig({
  output: 'server',
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
