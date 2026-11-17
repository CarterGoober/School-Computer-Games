# Deploying free on Oracle Cloud Always Free

This is the free-but-good option: an always-on VM with a real persistent disk, no sleep, no per-request limits, and no monthly bill within Oracle's Always Free allowance. Create the account and VM yourself (Oracle requires identity/card verification), then the game deployment is one command.

Estimated cost: **$0/month** within Always Free. You still need an Oracle Cloud account with a card and phone for verification.

## 1. Create the VM

1. Sign up at <https://signup.cloud.oracle.com/> and open the OCI Console.
2. Create a **Compute instance**:
   - Image: **Ubuntu 24.04** (or 22.04).
   - Shape: **VM.Standard.A1.Flex**, 1 OCPU / 6 GB (Always Free Arm). If you see "out of host capacity", retry another availability domain, or use **VM.Standard.E2.1.Micro** (1 GB, always free, enough for a small lobby).
   - Boot volume: 50 GB.
   - Assign a **public IPv4 address**.
   - Upload or create an SSH key; save the private key.
3. Open ingress in the instance's **VCN security list** for `0.0.0.0/0`:
   - TCP **80** (certificate issuance + redirect)
   - TCP **443** (HTTPS/WSS)
   - Keep **22** for SSH.
4. Do not expose port 8787 publicly; Caddy proxies it internally.

## 2. Pick a free hostname

`sslip.io` maps a hostname back to an IP address with no DNS setup. For a public IP of `140.238.1.2`, the hostname is:

```
140-238-1-2.sslip.io
```

Confirm it resolves:

```sh
getent hosts 140-238-1-2.sslip.io
```

Caddy will obtain a trusted certificate for that hostname. If you already own a domain, point an A record at the VM and use that instead.

## 3. Deploy

SSH in:

```sh
ssh -i /path/to/key ubuntu@140.238.1.2
```

Run the setup script:

```sh
curl -fsSL https://raw.githubusercontent.com/CarterGoober/School-Computer-Games/main/deploy/oracle-setup.sh -o setup.sh
bash setup.sh 140-238-1-2.sslip.io
```

The script installs Docker, clones the repository to `/opt/chroma-clash`, creates a `.env` with a fresh `CHROMA_SECRET`, starts the game and Caddy, and waits for health.

Verify:

```sh
curl https://140-238-1-2.sslip.io/api/health
```

Open <https://140-238-1-2.sslip.io/chroma/>.

## 4. Connect the static site (GitHub Pages or the garage)

The deployed game is complete on its own. To make the **existing static game page** connect to this server:

1. Edit `chroma/config.js`:
   ```js
   window.CHROMA_SERVER = "https://140-238-1-2.sslip.io";
   ```
2. Rebuild and commit:
   ```sh
   npm ci
   npm run build
   git add chroma/config.js chroma/dist/game.js
   git commit -m "Point the static game page at the arena server"
   git push
   ```
3. GitHub Pages will publish the new bundle. The game's CORS/WebSocket allowlist already includes `https://cartergoober.github.io` and the Afterclass site origin in the generated `.env`.

Alternatively, link or embed the server-hosted page directly from the main site:

```html
<iframe
  src="https://140-238-1-2.sslip.io/chroma/"
  title="Chroma Clash"
  allow="fullscreen"
  style="width:100%;height:min(80vh,760px);border:0;border-radius:12px"
></iframe>
```

If the main site origin differs from the two already listed, add it to `CHROMA_ALLOWED_ORIGINS` and `CHROMA_FRAME_ANCESTORS` in `/opt/chroma-clash/.env`, then restart:

```sh
cd /opt/chroma-clash
sudo docker compose up -d
```

## 5. Operations

- **Logs:** `cd /opt/chroma-clash && sudo docker compose logs -f`
- **Restart:** `sudo docker compose restart`
- **Update:** `cd /opt/chroma-clash && git pull && sudo docker compose up -d --build`
- **Back up accounts:**
  ```sh
  sudo docker run --rm -v chroma-data:/data -v "$PWD":/backup alpine \
    tar czf "/backup/chroma-$(date +%F).tgz" -C /data .
  ```
- **Restore:** stop the stack, extract the archive into the `chroma-data` volume, then start it.
- **Secret:** stored in `/opt/chroma-clash/.env` (mode 600). Keep it stable and out of Git. Changing it logs every runner out.

## 6. Free-tier caveats

- Arm capacity can be temporarily unavailable; retry or use the AMD micro shape. A 1 GB AMD micro runs this Node server for small lobbies.
- Oracle may reclaim idle Always Free compute. A game server is mostly idle; a free uptime monitor pinging `/api/health` every five minutes also helps keep the instance active and gives you alerts.
- 200 GB total block storage is shared across Always Free VMs; this setup uses 50 GB.
- There is no managed backup. Schedule the `docker run ... tar` command (host cron) and copy backups off the VM.
- Single instance only. Do not scale horizontally with the JSON store; see `docs/DEPLOYMENT.md` for the Postgres path.
- Oracle's terms and Always Free limits can change; confirm in the console.

## Alternatives if Oracle signup is not possible

- **Northflank free tier:** always-on services, but card verification is required and free persistent storage is limited; attach a volume if the plan allows.
- **Render free:** easy Docker deploys and WebSockets work, but the service sleeps after 15 minutes and free services have no persistent disk, so accounts would be lost on restart. Not suitable for saved progression without an external database.
- **Fly.io / Railway:** reliable and simple, but no meaningful free tier long-term; expect a few dollars a month.
