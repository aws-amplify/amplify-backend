---
'@aws-amplify/backend-notifications': major
---

Guarantee `defineNotifications` operates only against a Customer Profiles domain with Identity Resolution (profile merging) disabled.

- Create-from-scratch mode provisions the Customer Profiles domain with automatic (`Matching`) and rule-based (`RuleBasedMatching`) matching disabled.
- Attach mode validates the target domain at deploy time and fails the deployment with an actionable message when Identity Resolution is enabled.
- The `identify-user` API verifies at request time that the attached domain has Identity Resolution disabled, returning an error when it is enabled (short-lived per-domain cache; fails closed when the domain's configuration cannot be confirmed).

Impact: a deployment that attaches to — or a running app whose attached domain has — Identity Resolution enabled will be rejected. Attach `defineNotifications` to a dedicated Customer Profiles domain with Identity Resolution disabled.
