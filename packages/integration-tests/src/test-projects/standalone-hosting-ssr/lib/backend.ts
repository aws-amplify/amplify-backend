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
 * Query the AppSync GraphQL API directly using fetch.
 * This is the pattern for server-side GraphQL calls without the full Amplify SDK.
 */
export async function queryGraphQL(
  url: string,
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown>; errors?: unknown[] }> {
  const response = await fetch(url, {
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
