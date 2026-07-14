---
'@aws-amplify/backend-notifications': minor
---

Rename the identify-user request option `previousGuestIdentityId` to `guestIdentityId`. This is the request-body (wire-contract) field callers send to fold a prior guest profile into the authenticated profile on the identify-user route; the JSON body key, the `IdentifyUserOptions` type field, and the validation error message all now use `guestIdentityId`.
