// Minimal mock of Next.js standalone server for E2E testing.
// In a real project, this file is produced by `next build` with `output: 'standalone'`.
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body><h1>Hello from Next.js SSR</h1></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
