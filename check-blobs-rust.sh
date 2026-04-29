#!/bin/bash
# Easy script to build and run Rust blob checker

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🦀 BlobLens Rust Checker"
echo "════════════════════════════════════════════"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install Docker to continue."
    exit 1
fi

# Check if containers are running
if ! docker-compose ps | grep -q "blob-lens-postgres.*Up"; then
    echo "❌ Database container not running!"
    echo "   Start with: docker-compose up -d"
    exit 1
fi

# Option 1: If Rust is installed locally, use it
if command -v cargo &> /dev/null; then
    echo "✅ Rust found locally, building..."
    cd "$PROJECT_DIR"
    cargo run --release --bin check_blobs
else
    echo "📦 Building Rust checker in Docker..."
    
    # Build the checker image
    docker build -f "$PROJECT_DIR/Dockerfile.checker" \
        -t blob-lens-checker:latest \
        "$PROJECT_DIR" \
        2>&1 | grep -E "(Step|Successfully|error)" || true
    
    echo ""
    echo "🚀 Running checker..."
    
    # Run it connected to the docker network
    docker run --rm \
        --network blob_lens_blob-lens-network \
        -e DATABASE_URL="postgresql://postgres:password@postgres:5432/blob_lens" \
        blob-lens-checker:latest
fi
