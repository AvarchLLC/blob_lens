const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const sharedLogs = path.resolve(root, "..", "shared", "logs");

module.exports = {
  apps: [
    {
      name: "blob-lens-web",
      cwd: path.join(root, "apps", "web"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "800M",
      env_production: {
        NODE_ENV: "production",
      },
      out_file: path.join(sharedLogs, "web.out.log"),
      error_file: path.join(sharedLogs, "web.err.log"),
      time: true,
    },
    {
      name: "blob-lens-indexer",
      cwd: path.join(root, "apps", "api"),
      script: path.join(root, "apps", "api", "target", "release", "blob_lens"),
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env_production: {
        RUST_LOG: "info",
      },
      out_file: path.join(sharedLogs, "indexer.out.log"),
      error_file: path.join(sharedLogs, "indexer.err.log"),
      time: true,
    },
  ],
};
