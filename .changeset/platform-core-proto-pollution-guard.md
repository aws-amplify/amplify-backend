---
'@aws-amplify/platform-core': patch
---

Security hardening: reject prototype-polluting keys in the local configuration controller path walk (CWE-1321). `LocalConfigurationController.get()` and `set()` now throw an `AmplifyUserError` when a dotted path contains the reserved segments `__proto__`, `constructor`, or `prototype`, instead of walking into `Object.prototype`. Previously `set("__proto__.isAdmin", true)` polluted `Object.prototype` so that `({}).isAdmin === true`.
