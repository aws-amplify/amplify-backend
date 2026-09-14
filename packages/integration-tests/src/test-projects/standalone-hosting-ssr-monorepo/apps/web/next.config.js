/** @type {import('next').NextConfig} */
const path = require('path');

module.exports = {
  // G18: Standalone monorepo path. The Next.js standalone build needs to
  // trace dependencies up to the monorepo root, not just the app dir.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Skip type-checking and linting during build — this is a test project
  // focused on validating the deployment pipeline.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
