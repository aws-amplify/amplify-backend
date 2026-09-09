---
---

chore: make the `check_api_changes` usage generator tolerant of symbol-brand keys (build script only, no published package change)

`@aws-amplify/hosting`'s `ByoValue` is branded with a module-local `unique symbol`
(`BYO_BRAND`) used as a computed property key. API Extractor's report references
the key but omits the private symbol's declaration, so usage generated from the
report failed to compile (`TS2304: Cannot find name 'BYO_BRAND'`). Rather than
excluding the type (which cascaded to every member that references it —
`byoSecret`, `byoConfig`, `isByoValue`, `HostingProps`), the usage generator now
drops symbol-brand members when reconstructing a type. `ByoValue`'s brand is made
optional so the reconstruction remains assignable to the published type. Published
types are unaffected.
