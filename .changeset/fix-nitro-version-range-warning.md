---
'@aws-amplify/hosting': patch
---

Add a nitropack version-range warning and correct the Nitro aws-lambda patcher's
documented failure mode. `VERIFIED_NITRO_RANGE`'s comment claimed the patcher
"fails loudly with `UpstreamPatchPatternChangedError`" — it never did (and that
error doesn't exist for Nitro). The patcher now has an explicit version safety
net: `warnIfNitroOutOfRange` (mirroring the Next adapter's
`warnIfOpenNextOutOfRange`) flags an installed nitropack outside the verified
range before patching. Zero patches remains a non-fatal, expected state —
Nitro v3 (and any release with a REST-compatible request shape) needs no patch
at all, so the patcher emits an info note rather than warning/throwing, and the
version-range warning is the real "unverified nitropack" signal.
