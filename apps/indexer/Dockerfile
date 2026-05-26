# ---------------------------------------------------------------------------
# Stage 1 — build
# Uses the same Rust version as Reth recommends; build happens on Linux x86_64
# so the binary can run directly on ba-data without cross-compilation.
# ---------------------------------------------------------------------------
FROM rust:1.82-bookworm AS builder

# Dependencies for Reth / OpenSSL / libclang (needed by some Reth crates)
RUN apt-get update && apt-get install -y --no-install-recommends \
    clang libclang-dev llvm-dev \
    pkg-config libssl-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .

# Build both binaries in one shot; cache the registry layer separately
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    cargo build --release --features node --bin blob-indexer --bin backfill && \
    cp target/release/blob-indexer /blob-indexer && \
    cp target/release/backfill /backfill

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# Lean image; we only need the two compiled binaries and a CA cert bundle.
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /blob-indexer /usr/local/bin/blob-indexer
COPY --from=builder /backfill      /usr/local/bin/backfill

# The node binary is run with the same CLI flags as stock Reth.
# Mount the existing Reth data dir at /data and the JWT secret at /jwt/jwt.hex.
ENTRYPOINT ["blob-indexer"]
CMD ["node", \
     "--chain=mainnet", \
     "--datadir=/data", \
     "--authrpc.addr=0.0.0.0", "--authrpc.port=8551", \
     "--authrpc.jwtsecret=/jwt/jwt.hex", \
     "--http", "--http.addr=0.0.0.0", "--http.port=8545", \
     "--http.api=eth,net,web3,txpool,debug,trace,rpc,reth", \
     "--http.corsdomain=*", \
     "--ws", "--ws.addr=0.0.0.0", "--ws.port=8546", \
     "--ws.api=eth,net,web3,txpool", "--ws.origins=*", \
     "--metrics=0.0.0.0:9001", \
     "--port=30303", "--discovery.port=30303", \
     "--full", \
     "--log.file.directory=/data/logs"]
