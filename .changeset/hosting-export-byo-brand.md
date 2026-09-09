---
'@aws-amplify/hosting': patch
---

Brand `ByoValue` with a literal-typed `byoBrand` property instead of a `unique symbol` computed key. The symbol brand referenced an unexported name in the generated API report, breaking the `check_api_changes` compile on `main`; a literal-typed discriminant is self-contained in the report. Runtime behavior of `byoSecret`/`byoConfig`/`isByoValue` is unchanged.
