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

- Only the inert brand shape (`: true` value) is stripped; a symbol-keyed member
  with any other value type is kept verbatim and fails loud (`TS2304`) rather than
  vanishing.
- The brand must be declared OPTIONAL in the source type: API Extractor renders
  symbol-keyed properties without the `?` in the report, so optional-vs-required
  is not recoverable from the baseline; a required brand would surface downstream
  as `TS2741`. `ByoValue`'s brand is made optional (this changes the emitted
  `.d.ts`; its `API.md` is unchanged) and slightly loosens the type's nominal
  guarantee.
- Brands nested inside a member's value type are not descended into and still
  fail loud (`TS2304`) rather than being silently dropped.
