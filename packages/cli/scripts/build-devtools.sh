#!/bin/bash
# Script to build the devtools React app

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the React app directory
cd "$SCRIPT_DIR/../src/commands/sandbox/sandbox-devtools/react-app"

# Install dependencies and build the app
echo "Installing dependencies..."
npm install

echo "Building React app..."
npm run build

echo "Build complete! The app has been built to the 'dist' directory."
