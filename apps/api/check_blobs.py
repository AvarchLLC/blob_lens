#!/usr/bin/env python3
"""
BlobLens Database Inspector
Simple script to check collected blob data
"""

import subprocess
import sys
import os

def run_query(query):
    """Execute a PostgreSQL query via docker-compose"""
    try:
        result = subprocess.run(
            ["docker-compose", "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "blob_lens", "-c", query],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            print(f"❌ Query failed: {result.stderr}")
            return None
        return result.stdout
    except subprocess.TimeoutExpired:
        print("❌ Query timeout (database may be unresponsive)")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    # Check if containers are running
    try:
        result = subprocess.run(
            ["docker-compose", "ps"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "blob-lens-postgres" not in result.stdout or "Up" not in result.stdout:
            print("❌ PostgreSQL container not running!")
            print("   Start with: docker-compose up -d")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Docker error: {e}")
        sys.exit(1)

    print("\n🔍 BlobLens Database Inspector")
    print("════════════════════════════════════════════\n")

    # Query 1: Total transactions
    print("1️⃣  TOTAL BLOB TRANSACTIONS INDEXED")
    print("──────────────────────────────────────────")
    result = run_query("SELECT COUNT(*) as total_transactions FROM blob_transactions;")
    if result:
        print(result)

    # Query 2: Total blobs
    print("2️⃣  TOTAL BLOBS (Sum of all num_blobs)")
    print("──────────────────────────────────────────")
    result = run_query("SELECT SUM(num_blobs) as total_blobs FROM blob_transactions;")
    if result:
        print(result)

    # Query 3: Latest transactions
    print("3️⃣  LATEST 5 BLOB TRANSACTIONS")
    print("──────────────────────────────────────────")
    query = """SELECT tx_hash, block_number, num_blobs, max_fee_per_blob_gas, rollup, created_at 
    FROM blob_transactions 
    ORDER BY created_at DESC 
    LIMIT 5;"""
    result = run_query(query)
    if result:
        print(result)

    # Query 4: By rollup
    print("4️⃣  BLOB TRANSACTIONS BY ROLLUP")
    print("──────────────────────────────────────────")
    query = """SELECT rollup, COUNT(*) as transactions, SUM(num_blobs) as total_blobs
    FROM blob_transactions 
    GROUP BY rollup 
    ORDER BY total_blobs DESC;"""
    result = run_query(query)
    if result:
        print(result)

    # Query 5: Average fee
    print("5️⃣  AVERAGE FEE PER BLOB (Last 10 transactions)")
    print("──────────────────────────────────────────")
    query = """SELECT AVG(CAST(max_fee_per_blob_gas AS BIGINT))::BIGINT as avg_fee_per_blob_gas
    FROM (SELECT max_fee_per_blob_gas FROM blob_transactions ORDER BY created_at DESC LIMIT 10) t;"""
    result = run_query(query)
    if result:
        print(result)

    # Query 6: Busiest blocks
    print("6️⃣  BLOCKS WITH MOST BLOBS")
    print("──────────────────────────────────────────")
    query = """SELECT block_number, COUNT(*) as tx_count, SUM(num_blobs) as total_blobs
    FROM blob_transactions 
    GROUP BY block_number 
    ORDER BY total_blobs DESC 
    LIMIT 5;"""
    result = run_query(query)
    if result:
        print(result)

    print("════════════════════════════════════════════")
    print("✅ Collection is running continuously!")
    print("   Use: docker-compose logs blob-lens -f")
    print("   To see live indexing in progress\n")

if __name__ == "__main__":
    main()
