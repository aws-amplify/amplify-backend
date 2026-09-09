---
---

chore: make the `check_api_changes` usage generator tolerant of optional symbol brands (build script only, no published package change)

`@aws-amplify/hosting`'s `ByoValue` is branded with a module-local `unique symbol`
(`BYO_BRAND`) used as a computed property key. API Extractor's report references
the key but omits the private symbol's declaration, so usage generated from the
report failed to compile (`TS2304: Cannot find name 'BYO_BRAND'`). Rather than
excluding the type (which cascaded to every member that references it —
`byoSecret`, `byoConfig`, `isByoValue`, `HostingProps`), the usage generator now
drops **inert `: true`** symbol-brand members when reconstructing a type.

Scope and limits:

- Only optional symbol brands are supported; a required brand is rejected with an
  actionable error (the brand-stripped reconstruction cannot be assignable to a
  required, non-importable symbol brand).
- `ByoValue`'s brand is made optional, which changes the emitted `.d.ts` (its
  `API.md` is unchanged) and slightly loosens the type's nominal guarantee.
- Brands nested inside a member's value type are not descended into and still
  fail loud (`TS2304`) rather than being silently dropped.
