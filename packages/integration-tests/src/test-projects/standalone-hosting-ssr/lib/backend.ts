import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

export interface AmplifyConfig {
  auth?: {
    user_pool_id?: string;
    user_pool_client_id?: string;
    identity_pool_id?: string;
  };
  data?: {
    url?: string;
    api_key?: string;
    default_authorization_type?: string;
  };
  storage?: {
    buckets?: Array<{ bucket_name?: string; name?: string }>;
  };
  /** Diagnostic: which file path was loaded. */
  _loadedFrom?: string;
}

/**
 * Load amplify_outputs.json at runtime from known paths.
 * Walks up from __dirname and also checks /var/task (Lambda working dir).
 * Returns empty config if the file is not found (pre-deployment state).
 */
export function getAmplifyConfig(): AmplifyConfig {
  const fileName = 'amplify_outputs.json';

  // Build candidate paths — order from most specific to broadest
  const candidates: string[] = [
    // Lambda standard working directory
    join('/var/task', fileName),
    // CWD (same as /var/task in Lambda, but works locally too)
    join(process.cwd(), fileName),
  ];

  // Walk up from __dirname to find the file (handles nested .next/server/app/ paths)
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    candidates.push(join(dir, fileName));
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((p) => {
    const resolved = resolve(p);
    if (seen.has(resolved)) return false;
    seen.add(resolved);
    return true;
  });

  for (const configPath of uniqueCandidates) {
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        config._loadedFrom = configPath;
        return config;
      } catch {
        continue;
      }
    }
  }

  // Last resort: scan /var/task directory for the file
  try {
    const taskDir = '/var/task';
    if (existsSync(taskDir)) {
      const files = readdirSync(taskDir);
      if (files.includes(fileName)) {
        const fullPath = join(taskDir, fileName);
        const config = JSON.parse(readFileSync(fullPath, 'utf-8'));
        config._loadedFrom = fullPath;
        return config;
      }
    }
  } catch {
    // ignore scan errors
  }

  return { _loadedFrom: `NOT_FOUND (cwd=${process.cwd()}, __dirname=${__dirname})` };
}

/**
 * Validate that a URL is a trusted AWS AppSync endpoint.
 * Ensures file-sourced config values are safe before use in network requests.
 */
function validateAppSyncUrl(url: string): URL {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.endsWith('.appsync-api.amazonaws.com')
  ) {
    throw new Error(
      `Untrusted AppSync URL: ${url}. Expected https://*.appsync-api.amazonaws.com`,
    );
  }
  return parsed;
}

/**
 * Query the AppSync GraphQL API directly using fetch.
 * This is the pattern for server-side GraphQL calls without the full Amplify SDK.
 *
 * The url and apiKey originate from amplify_outputs.json (trusted CDK deployment output).
 */
export async function queryGraphQL(
  url: string,
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown>; errors?: unknown[] }> {
  // Validate that the URL is a trusted AWS AppSync endpoint before making the request.
  // The URL and API key are read from amplify_outputs.json (CDK deployment output).
  const validatedUrl = validateAppSyncUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    // codeql[js/file-data-in-network-request]: URL and apiKey are validated and sourced from amplify_outputs.json (trusted CDK deployment output)
    const response = await fetch(validatedUrl.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
