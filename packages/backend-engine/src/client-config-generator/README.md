## Intent

This directory is intended to be extractable into its own package if we want to vend a separate package for client config generation in the future.

If we do extract this directory into a separate package, either `backend-engine` will be a dependency of that package or we will need to refactor the `backend-output` directory in order to share reading/writing ot stack outputs
