# 🍷 Wine Cellar

A self-hosted wine cellar manager: track your bottles, place them in a visual 2D cellar,
follow drinking windows, write tasting notes. Multi-user, English & French.

## Run with Docker Compose

```yaml
services:
  winecellar:
    image: ghcr.io/judoor/wine-cellar:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data     # database + label photos — back this folder up
    environment:
      - ALLOW_REGISTRATION=true
      - SECURE_COOKIES=false
```

```bash
docker compose up -d
```

Open `http://<server-ip>:3000`. **The first account created becomes the administrator.**
The administrator can then close registrations from the *Administration* page.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `ALLOW_REGISTRATION` | `true` | `false` forbids new sign-ups (the very first account can always be created). |
| `SECURE_COOKIES` | `false` | Set to `true` when the app is served over HTTPS (reverse proxy). |
| `DATA_DIR` | `/data` | Where the SQLite database and uploads are stored. |
| `PORT` | `3000` | HTTP port inside the container. |

### Backup

Everything lives in the `data` folder (`winecellar.db` + `uploads/`). Stop the container and copy the folder.

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Database schema changes: edit `src/lib/db/schema.ts`, then run
`npx drizzle-kit generate` — migrations are applied automatically at startup.

### Adding a language

1. Copy `src/i18n/messages/en.ts` to `src/i18n/messages/<code>.ts` and translate it.
2. Register it in `src/i18n/config.ts`.
