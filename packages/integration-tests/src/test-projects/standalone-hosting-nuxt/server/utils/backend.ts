import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

let cached: AmplifyConfig | undefined;

export function getAmplifyConfig(): AmplifyConfig {
  if (cached) return cached;

  const candidates = [
    join(process.cwd(), 'amplify_outputs.json'),
    '/var/task/amplify_outputs.json',
  ];

  for (const configPath of candidates) {
    if (existsSync(configPath)) {
      try {
        cached = JSON.parse(readFileSync(configPath, 'utf-8'));
        return cached!;
      } catch {
        continue;
      }
    }
  }

  cached = {};
  return cached;
}

export async function queryGraphQL(
  url: string,
  apiKey: string,
  query: string,
): Promise<{ data?: Record<string, unknown>; errors?: unknown[] }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `GraphQL request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}
