---
'@aws-amplify/hosting': minor
---

refactor(hosting): import the hosting construct and adapters from `@aws-blocks/hosting`

The framework-agnostic L3 hosting construct, the framework adapters, the deploy
manifest, and the build defaults are now sourced from `@aws-blocks/hosting`
instead of being maintained as a fork inside this package. The public API is
unchanged — `@aws-amplify/hosting` continues to export `defineHosting`,
`definePipeline`, `AmplifyHostingConstruct` (an alias of the upstream
`HostingConstruct`), and the adapters — but the implementation is now owned
upstream. The Amplify-specific glue (`defineHosting`, the pipeline subsystem,
backend-output integration, and the build runner) remains in this package.
