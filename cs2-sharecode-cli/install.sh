#!/bin/bash

# CS ShareCode CLI Installation Script

echo "Installing CS ShareCode CLI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Make the CLI executable
chmod +x dist/index.js

echo "Installation complete!"
echo ""
echo "Usage:"
echo "  node dist/index.js <sharecode>"
echo "  node dist/index.js CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
echo ""
echo "Or install globally:"
echo "  npm install -g ."
echo "  cs-sharecode <sharecode>"