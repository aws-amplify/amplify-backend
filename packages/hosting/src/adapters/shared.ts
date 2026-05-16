/**
 * Helpers shared across framework adapters that walk a build output
 * directory and translate it into a DeployManifest.
 *
 * Lives behind a leading-underscore filename to signal "package-private
 * to adapters/" — the registry exports in `index.ts` are the supported
 * surface.
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively collect every `.html` file under `dir`.
 */
export const walkHtmlFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Convert a relative `.html` path into a CloudFront route pattern.
 * `about/index.html` → `/about`
 * `index.html`       → `/`
 * `blog/post.html`   → `/blog/post`
 */
export const htmlFileToUrlPath = (relPath: string): string => {
  let urlPath = '/' + relPath.replace(/\\/g, '/').replace(/\.html$/, '');
  urlPath = urlPath.replace(/\/index$/, '');
  return urlPath === '' ? '/' : urlPath;
};

/**
 * Copy `amplify_outputs.json` from project root into a server bundle so
 * SSR code can read backend configuration at runtime. No-op if the file
 * is missing or already in the destination.
 */
export const copyAmplifyOutputsToServerBundle = (
  projectDir: string,
  serverDir: string,
): void => {
  const src = path.join(projectDir, 'amplify_outputs.json');
  if (!fs.existsSync(src)) return;

  const dest = path.join(serverDir, 'amplify_outputs.json');
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    process.stderr.write(
      `\u{1F4E6} Copied amplify_outputs.json → ${path.relative(projectDir, dest)}\n`,
    );
  }
};
