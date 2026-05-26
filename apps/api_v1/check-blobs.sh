#!/bin/bash

# BlobLens Database Query Script
# Run this to check what blobs have been collected

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 BlobLens Database Inspector"
echo "════════════════════════════════════════════"
echo ""

# Check if containers are running
if ! docker-compose -f "$PROJECT_DIR/docker-compose.yml" ps | grep -q "blob-lens-postgres"; then
    echo "❌ PostgreSQL container not running!"
    echo "Start with: docker-compose up -d"
    exit 1
fi

echo "1️⃣  TOTAL BLOB TRANSACTIONS INDEXED"
echo "──────────────────────────────────────────"
docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d blob_lens -c \
  "SELECT COUNT(*) as total_transactions FROM blob_transactions;" 2>/dev/null
echo ""

echo "2️⃣  TOTAL BLOBS (Sum of all num_blobs)"
echo "──────────────────────────────────────────"
docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d blob_lens -c \
  "SELECT SUM(num_blobs) as total_blobs FROM blob_transactions;" 2>/dev/null
echo ""

echo "3️⃣  LATEST 5 BLOB TRANSACTIONS"
echo "──────────────────────────────────────────"
docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d blob_lens -c \
  "SELECT tx_hash, block_number, num_blobs, max_fee_per_blob_gas, rollup, created_at 
   FROM blob_transactions 
   ORDER BY created_at DESC 
   LIMIT 5;" 2>/dev/null
echo ""

echo "4️⃣  BLOB TRANSACTIONS BY ROLLUP"
echo "──────────────────────────────────────────"
docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d blob_lens -c \
  "SELECT rollup, COUNT(*) as transactions, SUM(num_blobs) as total_blobs
   FROM blob_transactions 
   GROUP BY rollup 
   ORDER BY total_blobs DESC;" 2>/dev/null
echo ""

echo "5️⃣  AVERAGE FEE PER BLOB (Last 10 transactions)"
echo "──────────────────────────────────────────"
docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d blob_lens -c \
  "SELECT AVG(CAST(max_fee_per_blob_gas AS BIGINT))::BIGINT as avg_fee_per_blob_gas
   FROM (SELECT max_fee_per_blob_gas FROM blob_transactions ORDER BY created_at DESC LIMIT 10) t;" 2>/dev/null
echo ""

echo "6️⃣  BLOCKS WITH MOST BLOBS"
echo "──────────────────────────────────────────"
docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d blob_lens -c \
  "SELECT block_number, COUNT(*) as tx_count, SUM(num_blobs) as total_blobs
   FROM blob_transactions 
   GROUP BY block_number 
   ORDER BY total_blobs DESC 
   LIMIT 5;" 2>/dev/null
echo ""

echo "════════════════════════════════════════════"
echo "✅ Collection is running continuously!"
echo "   Use: docker-compose logs blob-lens -f"
echo "   To see live indexing in progress"
