---
'@aws-amplify/hosting': patch
---

fix(hosting): detectFramework checks package.json deps instead of node_modules resolution

Previously, detectFramework used isPackageExists() which resolves through the entire
node_modules tree, catching transitive and peer dependencies. This caused false positives
when 'next' was installed as a peer dep (e.g., from @aws-blocks/core) but the project
itself was a Vite SPA.

Now reads the project's own package.json dependencies/devDependencies directly.

Fixes aws-amplify/private-amplify-backend-staging#833
