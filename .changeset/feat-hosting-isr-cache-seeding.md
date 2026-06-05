---
'@aws-amplify/hosting': minor
---

Seed the OpenNext ISR cache at deploy time so prerendered ISR/SSG pages are
served from the cache on first request instead of cold-rendering on demand.
The Next.js adapter now surfaces the build's prebuilt incremental-cache
directory (`.open-next/cache`) and the `dynamodb-provider` tag-table seeder,
and the hosting construct uploads the cache to the dedicated cache bucket and
runs the tag-table seeder as a one-shot custom resource on each deploy. Without
this, every prerendered page returned `x-nextjs-cache: MISS` until requested at
least once, and tag-based revalidation could not purge a page before its first
hit.
