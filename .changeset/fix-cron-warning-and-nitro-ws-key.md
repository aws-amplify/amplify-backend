---
'@aws-amplify/hosting': patch
---

Warn (never throw) on WebSocket and cron features across all adapters. Neither
is supported on this serverless SSR architecture — CloudFront → API Gateway
REST → a request/response Lambda can't complete a WebSocket upgrade, and there
is no general scheduler (EventBridge is used only for opt-in `compute.warmup`),
so a declared cron never fires. Since neither feature is widely deployable and
the rest of the app works, these now surface a clear warning instead of failing
the build:

- **Nitro:** previously threw `UnsupportedNitroFeatureError` on
  `experimental.websocket` / `scheduledTasks`; now warns. Also catches Nitro 3's
  renamed `features.websocket` flag (the 2.x check was `experimental.websocket`
  only, so a v3 WebSocket app slipped through and silently 200'd).
- **Next.js / Astro:** warn when `vercel.json` declares `crons`.

A shared `feature_warnings` module provides the consistent messaging. No
WebSocket detection is added for Next/Astro — neither has a server-side WS
feature to key off, and a `ws`/`socket.io` dependency is overwhelmingly
client-side usage that works fine.
