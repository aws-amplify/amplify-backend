---
'@aws-amplify/hosting': patch
---

Stop hard-failing deploys that use Nitro `routeRules.proxy`. The adapter lifts
proxy rules into `manifest.rewrites[]`, and the L3 threw
`RewritesNotYetSupportedError` on any rewrites — blocking a deployable, working
app. These proxy rules already function: the proxied path matches the catch-all
SSR route, where the bundled Nitro runtime relays the request to the upstream.
The L3 now warns that the rewrite isn't edge-optimized (one SSR Lambda
invocation per proxied request instead of direct CloudFront routing) instead of
failing the build.
