#!/bin/bash
# Temporary patch: adds 'standalone' case to bundled backend-output-storage
# inside data-construct and graphql-api-construct.
#
# These packages bundle their own copy via jsii that doesn't know about
# the 'standalone' deployment type yet. Remove once they release with support.

set -e

FILES=(
  "node_modules/@aws-amplify/data-construct/node_modules/@aws-amplify/backend-output-storage/lib/store_attribution_metadata.js"
  "node_modules/@aws-amplify/graphql-api-construct/node_modules/@aws-amplify/backend-output-storage/lib/store_attribution_metadata.js"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    if grep -q "case 'standalone':" "$file"; then
      continue
    fi
    # Use node for cross-platform file manipulation (sed behaves differently on Windows/macOS/Linux)
    node -e "
      const fs = require('fs');
      const content = fs.readFileSync('$file', 'utf-8');
      const patched = content.replace(
        \"case 'sandbox':\",
        \"case 'standalone': return 'AmplifyStandalone';\n            case 'sandbox':\"
      );
      fs.writeFileSync('$file', patched);
    "
  fi
done
