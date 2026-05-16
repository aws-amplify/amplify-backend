/**
 * Builds the source for the Astro config-bridge the adapter writes to
 * `<projectDir>/.amplify/astro/config-bridge.mjs` before the build, then
 * removes after.
 *
 * `astro build --config <bridge>` runs the bridge instead of the user's
 * config. The bridge imports the user's config, merges in
 * `@astrojs/node`'s `mode: 'standalone'` adapter, and forces
 * `output: 'server'` + `vite.ssr.noExternal: true` (so the SSR runtime
 * bundles into a single file with no node_modules dependency).
 *
 * Why delegate to `@astrojs/node`: it ships everything we'd otherwise
 * have to write — static-file fallback, MIME types, streaming,
 * trailing-slash handling, cookies, error pages. Astro maintains it
 * upstream so we get fixes for free.
 *
 * The user's astro.config filename varies (.mjs, .ts, .mts, .cjs, .js),
 * so we can't ship a static bridge — the relative import path has to
 * point at whichever file the user actually has.
 * @param userConfigRelativePath Forward-slash relative path from
 *   `<projectDir>/.amplify/astro/` to the user's astro config file.
 *   Example: `../../astro.config.mjs`.
 * @param opts.bodySizeLimit Bytes; passed to `node({ bodySizeLimit })`
 *   so requests above the platform ceiling fail inside Astro with a
 *   clear error rather than mid-stream at the Lambda boundary.
 */
export const buildAstroConfigBridgeSource = (
  userConfigRelativePath: string,
  opts: { bodySizeLimit: number },
): string => `import userConfig from '${userConfigRelativePath}';
import node from '@astrojs/node';

if (userConfig.adapter) {
  process.stderr.write(
    \`[amplify-hosting:astro] replacing user adapter "\${userConfig.adapter.name}" with @astrojs/node (standalone).\\n\`,
  );
}

export default {
  ...userConfig,
  output: 'server',
  adapter: node({
    mode: 'standalone',
    bodySizeLimit: ${opts.bodySizeLimit},
  }),
  vite: {
    ...(userConfig.vite ?? {}),
    ssr: {
      ...((userConfig.vite ?? {}).ssr ?? {}),
      // Bundle every transitive dep into the server output so the
      // Lambda zip needs no node_modules at runtime.
      noExternal: true,
    },
  },
};
`;
