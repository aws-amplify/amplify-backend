---
'@aws-amplify/hosting': patch
---

Honor OpenNext's `disableTagCache` in the Next.js adapter. The adapter
hardcoded `tagRevalidation: true` whenever ISR was detected, so the L3
provisioned a DynamoDB tag table even when the user disabled the tag cache —
a billed, unused resource. When `additionalProps.disableTagCache` is set, the
manifest now reports `tagRevalidation: false` (no DynamoDB, no tag-table
seeder) while keeping the S3 incremental cache and revalidation queue.
