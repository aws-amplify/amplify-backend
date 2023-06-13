## Intent

This directory is intended to be extractable into its own package if the need arises in the future.
The contents of `backend-identifier` would also need to be pulled into a separate package as that directory contains the shared code between `backend-engine` and `generate-client-config`.

This is all left in `backend-engine` currently to prevent premature package explosion.
