FROM ghcr.io/paradigmxyz/reth:latest
COPY target/release/blob-indexer /usr/local/bin/reth

# The base image's inherited HEALTHCHECK runs `curl`, which isn't present in
# this derived image (confirmed: container shows "unhealthy" with
# "curl: not found" even though the node is fully functional — verified via
# `docker logs` showing live block processing). Disable it rather than guess
# at the base image's package manager; rely on `docker logs` / external
# monitoring instead.
HEALTHCHECK NONE
