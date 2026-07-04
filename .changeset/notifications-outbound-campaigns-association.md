---
'@aws-amplify/backend-notifications': minor
---

In create-from-scratch mode (`defineNotifications()` with no `domainName`), automatically associate the newly created Customer Profiles domain with the new Amazon Connect instance's Outbound Campaigns v2 at deploy time, so Connect Journeys can target the domain's profiles with no manual console step. This is implemented as a Lambda-backed CDK custom resource that onboards the instance and wires both sides of the integration on create/update and best-effort reverses it on delete. Attach mode (an existing `domainName` is provided) is unchanged — associating a pre-existing domain remains the user's responsibility.
