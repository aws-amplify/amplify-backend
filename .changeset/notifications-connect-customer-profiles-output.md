---
'@aws-amplify/backend-notifications': minor
'@aws-amplify/client-config': minor
---

Surface the Amazon Connect Customer Profiles notifications endpoint under the canonical `notifications` section of `amplify_outputs.json` instead of `custom`.

`defineNotifications` now writes the invoke endpoint and region to `notifications.amazon_connect_customer_profiles.{endpoint, aws_region}` — the exact path Amplify JS reads in `parseAmplifyOutputs` — rather than `custom.CustomerProfiles`. The client config v1.4 schema (`AWSAmplifyBackendOutputs`) adds a corresponding optional `notifications.amazon_connect_customer_profiles` object (`aws_region` + `endpoint`); it is optional, so existing consumers are unaffected.
