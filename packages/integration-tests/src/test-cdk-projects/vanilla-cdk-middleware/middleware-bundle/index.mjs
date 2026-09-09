/**
 * Lambda@Edge middleware handler for e2e test.
 *
 * Redirects /protected → /login if no 'auth-token' cookie is present.
 * All other requests pass through unmodified.
 */
export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // Only intercept /protected path
  if (uri === '/protected' || uri === '/protected/') {
    const cookies = request.headers.cookie || [];
    const cookieString = cookies.map((c) => c.value).join('; ');

    // If no auth-token cookie, redirect to /login
    if (!cookieString.includes('auth-token=')) {
      return {
        status: '302',
        statusDescription: 'Found',
        headers: {
          location: [
            {
              key: 'Location',
              value: '/login',
            },
          ],
          'x-middleware-redirect': [
            {
              key: 'X-Middleware-Redirect',
              value: 'true',
            },
          ],
        },
      };
    }
  }

  // Pass through all other requests
  return request;
};
