/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip type-checking and linting during build — this is a test project
  // focused on validating the deployment pipeline, not type correctness.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Ensure amplify_outputs.json is bundled into the server function
  outputFileTracingIncludes: {
    '/*': ['./amplify_outputs.json'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; connect-src 'self' https: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
