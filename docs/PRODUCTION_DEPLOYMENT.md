# BlobLens Production Deployment (Server + Nginx + PM2 + GitHub Actions)

This repo now includes:

- GitHub Actions workflow: `.github/workflows/deploy-production.yml`
- PM2 process file: `ops/pm2/ecosystem.config.cjs`
- Nginx reverse proxy template: `ops/nginx/blob-lens.conf`

The deployment uses a **release directory strategy** on the server:

- `/opt/blob-lens/releases/<timestamp>`
- `/opt/blob-lens/current` (symlink to active release)
- `/opt/blob-lens/shared/env` (persistent env files)
- `/opt/blob-lens/shared/logs` (persistent logs)

---

## 1) GitHub Secrets Required

Add these in GitHub repo settings (`Settings -> Secrets and variables -> Actions`):

- `SERVER_HOST` = server IP or domain
- `SERVER_USER` = SSH user (example: `root` or `deploy`)
- `SERVER_SSH_KEY` = private key for SSH auth
- `DISCORD_WEBHOOK` = optional, for deploy notifications
- `DEPLOY_REPO_URL` = optional, recommended for private repos  
  Example: `https://x-access-token:<TOKEN>@github.com/<org>/<repo>.git`

If `DEPLOY_REPO_URL` is not set, workflow falls back to:

- `https://github.com/<owner>/<repo>.git`

---

## 2) Server Bootstrap (One-Time)

Run once on Ubuntu server:

```bash
sudo apt update
sudo apt install -y nginx curl git build-essential pkg-config libssl-dev

# Node + pnpm (via corepack) + pm2
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
corepack enable
corepack prepare pnpm@9.15.0 --activate
npm install -g pm2

# Rust
curl https://sh.rustup.rs -sSf | sh -s -- -y
source ~/.cargo/env
rustup default stable
```

Create shared directories and env files:

```bash
sudo mkdir -p /opt/blob-lens/shared/env /opt/blob-lens/shared/logs /opt/blob-lens/releases
sudo chown -R $USER:$USER /opt/blob-lens
```

Create `/opt/blob-lens/shared/env/api.env`:

```env
ALCHEMY_KEY=YOUR_ALCHEMY_KEY
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require
RUST_LOG=info
```

Create `/opt/blob-lens/shared/env/web.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require
# Use your server IP for now; switch to https://YOUR_DOMAIN later.
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_PUBLIC_IP
NEXT_PUBLIC_MARKET_REFRESH_MS=12000
NEXT_PUBLIC_LEADERBOARD_REFRESH_MS=30000
```

---

## 3) Nginx Setup

Copy and activate config:

```bash
sudo cp /opt/blob-lens/current/ops/nginx/blob-lens.conf /etc/nginx/sites-available/blob-lens.conf
```

No domain yet:

- Set `server_name YOUR_SERVER_PUBLIC_IP;` in config
- Disable the default Nginx site (it often already uses `server_name _;` and causes warnings)

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Then:

```bash
sudo ln -sfn /etc/nginx/sites-available/blob-lens.conf /etc/nginx/sites-enabled/blob-lens.conf
sudo nginx -t
sudo systemctl reload nginx
```

Open HTTP in firewall/security group:

```bash
# If using UFW on server
sudo ufw allow 80/tcp
sudo ufw status
```

Also allow inbound TCP `80` in your cloud provider firewall/security group.

Notes:

- Next.js app is proxied to `127.0.0.1:3000`
- Rust indexer API is proxied to `127.0.0.1:8080` under `/indexer/*`
- Keeping Rust API under `/indexer/*` avoids conflict with Next.js `/api/*` routes.

---

## 4) PM2 Persistence

After first successful deploy, enable PM2 startup:

```bash
pm2 startup
# run the command PM2 prints (with sudo)
pm2 save
```

---

## 5) Deployment Flow

On every push to `main`, workflow:

1. Creates a new release directory
2. Clones repo into new release
3. Symlinks env files from `/opt/blob-lens/shared/env`
4. Installs deps (`pnpm install`)
5. Builds web (`pnpm --filter web build`)
6. Builds Rust API/indexer (`cargo build --release`)
7. Switches `/opt/blob-lens/current` symlink
8. Reloads PM2 (`blob-lens-web`, `blob-lens-indexer`)
9. Runs health checks:
   - `http://127.0.0.1:3000/api/health`
   - `http://127.0.0.1:8080/health`
10. Cleans old releases (keeps last 5)

If health check fails, workflow attempts rollback to previous release and reloads PM2.

---

## 6) Ops Commands

PM2:

```bash
pm2 ls
pm2 logs blob-lens-web
pm2 logs blob-lens-indexer
pm2 restart blob-lens-web
pm2 restart blob-lens-indexer
```

Health checks:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:8080/health
```

Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Public check from your laptop:

```bash
curl -I http://YOUR_SERVER_PUBLIC_IP
curl -I http://YOUR_SERVER_PUBLIC_IP/indexer/health
```
