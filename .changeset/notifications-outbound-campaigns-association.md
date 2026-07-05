---
'@aws-amplify/backend-notifications': minor
---

In create-from-scratch mode (`defineNotifications()` with no `domainName`), the newly created Amazon Connect instance and Customer Profiles domain are now fully usable for Connect Journeys with no manual console setup:

- The created domain is automatically associated with the new instance's Outbound Campaigns v2 at deploy time (a Lambda-backed CDK custom resource onboards the instance and wires both sides of the integration on create/update, and best-effort reverses it on delete), so Journeys can target the domain's profiles.
- The created domain is registered to the instance as its Customer Profiles (CTR) store, enabling the instance's Customer Profiles feature and the Journey segment builder.
- The created domain is named so the Amazon Connect instance's service-linked role can access it, resolving the "instance does not have permissions to access Customer Profiles" console error.
- The created instance has its Outbound Campaigns feature enabled, so the Amazon Connect console can author Journeys and campaigns against it (resolving the `connect-campaigns:CreateCampaign` / `ListCampaigns` console errors).
- A message-templates knowledge base is provisioned and associated with the instance, so push message templates are authorable in the console (and discoverable by the push-delivery Lambda) with no manual knowledge-base setup. The templates themselves remain the user's to author.

Attach mode (an existing `domainName` is provided) is unchanged — the pre-existing domain's associations, feature bindings, and naming remain the user's responsibility.
