// Minimal mock of Next.js standalone server for E2E testing — version 2.
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body><h1>Hello SSR v2</h1><p>Updated server-rendered content.</p></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
