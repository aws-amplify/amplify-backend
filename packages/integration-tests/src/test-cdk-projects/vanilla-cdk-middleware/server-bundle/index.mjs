/**
 * Simple SSR Lambda handler for e2e test.
 * Renders a basic HTML response for any route.
 */
export const handler = async (event) => {
  const path = event.rawPath || '/';

  if (path === '/protected' || path === '/protected/') {
    return {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html><body><h1>Protected Content</h1><p>You are authenticated.</p></body></html>',
    };
  }

  if (path === '/login' || path === '/login/') {
    return {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html><body><h1>Login Page</h1><p>Please sign in.</p></body></html>',
    };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'text/html' },
    body: `<html><body><h1>Hello from SSR</h1><p>Path: ${path}</p></body></html>`,
  };
};
