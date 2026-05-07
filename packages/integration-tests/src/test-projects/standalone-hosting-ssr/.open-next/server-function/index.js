// Lambda handler for E2E testing (OpenNext-style native handler).
// Reads amplify_outputs.json and queries the GraphQL API to prove backend connectivity.
const https = require('https');
const path = require('path');

let amplifyConfig = {};
try {
  amplifyConfig = require(path.join(__dirname, 'amplify_outputs.json'));
} catch (_e) {
  // amplify_outputs.json not present — will render disconnected state
}

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

exports.handler = async (event) => {
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
    '<h1>Hello SSR v1</h1>',
    '<p>Server-rendered by Lambda via OpenNext.</p>',
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
    },
    body,
    isBase64Encoded: false,
  };
};
