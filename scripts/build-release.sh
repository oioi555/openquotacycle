#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Clean previous bundle
rm -rf src-tauri/target/release/bundle

# Build
bun tauri build "$@"

echo ""
echo "Build complete! Output:"
ls -la src-tauri/target/release/bundle/deb/*.deb 2>/dev/null || ls -la src-tauri/target/release/bundle/appimage/*.AppImage 2>/dev/null || echo "No .deb or .AppImage found"
