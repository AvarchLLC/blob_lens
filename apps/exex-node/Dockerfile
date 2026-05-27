FROM ubuntu:24.04

RUN apt-get update && apt-get install -y ca-certificates libstdc++6 && rm -rf /var/lib/apt/lists/*

COPY target/release/blob-indexer /usr/local/bin/blob-indexer

ENTRYPOINT ["/usr/local/bin/blob-indexer"]
