import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
}

/**
 * Load amplify_outputs.json at runtime from known paths.
 * Returns empty config if the file is not found (pre-deployment state).
 */
export function getAmplifyConfig(): AmplifyConfig {
  const candidates = [
    join(process.cwd(), 'amplify_outputs.json'),
    join(__dirname, '..', 'amplify_outputs.json'),
    '/var/task/amplify_outputs.json',
  ];

  for (const configPath of candidates) {
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch {
        continue;
      }
    }
  }

  return {};
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

  // codeql[js/file-data-in-network-request]: URL and apiKey are validated and sourced from amplify_outputs.json (trusted CDK deployment output)
  const response = await fetch(validatedUrl.href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
