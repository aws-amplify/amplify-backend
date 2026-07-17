---
'@aws-amplify/client-config': patch
---

Allow a `notifications` block in `amplify_outputs.json` that contains only `amazon_connect_customer_profiles` (no Pinpoint `aws_region`/`amazon_pinpoint_app_id`/`channels`) to validate against the v1.4 schema. The three Pinpoint fields are now required only for a Pinpoint-shaped notifications block.
