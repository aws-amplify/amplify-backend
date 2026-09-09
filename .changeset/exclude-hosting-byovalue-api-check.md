---
---

chore: exclude `ByoValue` from the `check_api_changes` usage generator (build script only, no published package change)

`@aws-amplify/hosting`'s `ByoValue` is branded with a module-local `unique symbol`
used as a computed property key. API Extractor's report references the key but
omits the private symbol declaration, so the usage generated from the report
fails to compile (`TS2304: Cannot find name 'BYO_BRAND'`). Published types are
unaffected. Exclude the type from usage generation, matching the existing
`FromJSONSchema` precedent.
