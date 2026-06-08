---
'@aws-amplify/hosting': patch
---

Make the CloudFront behavior-count limit the single, accurate enforcement point
for prerendered-page routing, and remove the Astro-only page cap so both
adapters behave consistently.

- **Astro:** dropped `MAX_PRERENDERED_STATIC_PAGES` (8). The adapter now emits a
  `/<page>/*` static route for every prerendered page (matching the Nitro
  adapter) and relies on the L3 to derive the bare `/<page>` behavior — instead
  of each adapter applying its own divergent cap.
- **L3 (`CdnConstruct`):** the behavior-budget guard now counts the _actual_
  CloudFront behaviors after all sources contribute (per-route + derived bare
  paths + assetPrefix + custom headers + `/builds/*`), checked just before the
  Distribution is created. Previously it counted manifest routes _before_ the
  bare-path derivation doubled them, so ~13–24 prerendered pages passed the
  guard and then failed opaquely in CloudFormation at the 25-behavior hard
  limit. `TooManyRoutesError` now fires accurately at synth with a clearer
  message.
