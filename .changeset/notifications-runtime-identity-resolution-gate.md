---
'@aws-amplify/backend-notifications': patch
---

Refuse profile and device writes at RUNTIME while the attached Customer Profiles domain has Identity Resolution (profile merging) enabled.

The deploy-time guard only runs during a deployment, so a domain that has matching enabled AFTERWARDS would keep accepting writes until the next deploy. The write Lambda now re-checks `GetDomain` per request and rejects `POST /identify-user` and `POST /register-device` with 409 while merging is on, before any `PutProfileObject` / `UpdateProfile` / device write is issued. `POST /remove-device` is intentionally never gated: de-registration reduces exposure, so it stays available. The verdict is cached in memory per domain with a TTL and is served stale for a short grace window if `GetDomain` is briefly unavailable, so a transient failure does not fail writes; with no usable verdict the request is refused with 503 rather than assumed safe. The write Lambda's execution role is granted read-only `profile:GetDomain` on the attached domain only.
