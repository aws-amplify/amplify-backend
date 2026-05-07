// Lambda handler for E2E testing (OpenNext-style native handler) — V2.
// Same as v1 but with updated content marker to prove redeployment worked.
// Supports routing: /, /api/health, /old-path (rewrite), 404 for unknown paths.
const https = require('https');
const path = require('path');

let amplifyConfig = {};
try {
  amplifyConfig = require(path.join(__dirname, 'amplify_outputs.json'));
} catch (_e) {
  // amplify_outputs.json not present
}

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy':
    "default-src 'self'; connect-src 'self' https: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
};

const queryGraphQL = (url, apiKey, query) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = JSON.stringify({ query });

    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse GraphQL response: ' + body));
          }
        });
      },
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

const getRequestPath = (event) => {
  return event.rawPath || event.path || '/';
};

exports.handler = async (event) => {
  const requestPath = getRequestPath(event);

  // API health route
  if (requestPath === '/api/health') {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        ...SECURITY_HEADERS,
      },
      body: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
      isBase64Encoded: false,
    };
  }

  // Middleware rewrite: /old-path is transparently rewritten to serve home content
  if (requestPath === '/old-path') {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/html',
        'cache-control': 's-maxage=60, stale-while-revalidate',
        'x-middleware-rewrite': '/rewritten-from-old-path',
        ...SECURITY_HEADERS,
      },
      body: '<html><body><h1>Rewritten Content v2</h1><p>This was served via middleware rewrite from /old-path</p></body></html>',
      isBase64Encoded: false,
    };
  }

  // Main SSR route (only for / or /index)
  if (requestPath === '/' || requestPath === '/index') {
    let backendStatus = 'disconnected';
    let graphqlResult = 'no-query';
    const userPoolId = amplifyConfig.auth?.user_pool_id || 'none';

    try {
      if (amplifyConfig.data?.url && amplifyConfig.data?.api_key) {
        const result = await queryGraphQL(
          amplifyConfig.data.url,
          amplifyConfig.data.api_key,
          '{ listTodos { items { id content } } }',
        );

        if (result.data && 'listTodos' in result.data) {
          graphqlResult = JSON.stringify(result.data);
          backendStatus = 'connected';
        } else if (result.errors) {
          graphqlResult = 'errors:' + JSON.stringify(result.errors);
          backendStatus = 'error';
        }
      }
    } catch (e) {
      graphqlResult = 'exception:' + e.message;
      backendStatus = 'error';
    }

    const body = [
      '<html><body>',
      '<h1>Hello SSR v2</h1>',
      '<p>Server-rendered by Lambda via OpenNext (v2 deploy).</p>',
      '<p data-testid="backend-status">backend-' + backendStatus + '</p>',
      '<p data-testid="graphql-result">' + graphqlResult + '</p>',
      '<p data-testid="user-pool-id">' + userPoolId + '</p>',
      '</body></html>',
    ].join('');

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/html',
        'cache-control': 's-maxage=60, stale-while-revalidate',
        ...SECURITY_HEADERS,
      },
      body,
      isBase64Encoded: false,
    };
  }

  // ISR route: returns current timestamp with short s-maxage for stale-while-revalidate testing
  if (requestPath === '/isr') {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/html',
        'cache-control': 's-maxage=1, stale-while-revalidate=59',
        ...SECURITY_HEADERS,
      },
      body: `<html><body><h1>ISR Page</h1><p>ISR page generated at: ${Date.now()}</p></body></html>`,
      isBase64Encoded: false,
    };
  }

  // 404 for all other routes
  return {
    statusCode: 404,
    headers: {
      'content-type': 'text/html',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS,
    },
    body: '<html><body><h1>404 - Not Found</h1><p>The requested page does not exist.</p></body></html>',
    isBase64Encoded: false,
  };
};
