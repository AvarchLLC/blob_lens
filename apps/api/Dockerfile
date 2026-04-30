# Build stage
FROM rust:latest as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/blob_lens /app/blob_lens

# Create non-root user for security
RUN groupadd -g 1000 boblens && \
    useradd -d /app -u 1000 -g boblens -s /sbin/nologin boblens && \
    chown -R boblens:boblens /app

USER boblens

# Set environment
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health 2>/dev/null || exit 1

EXPOSE 8080

CMD ["/app/blob_lens"]
