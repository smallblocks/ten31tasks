# Ten31 Tasks

A self-hosted team productivity tracker for [Start9](https://start9.com) StartOS.

## Architecture

```
Browser → nginx (port 80)
            ├── /api/*  → uvicorn (FastAPI, port 8000) → SQLite (/data/)
            └── /*      → static React app (SPA fallback)
```

Every mutation (keystroke, check, commit, reflection) fires a `PUT` to the API.
Text input is debounced at 300ms. Toggle/lock/carry-forward actions save immediately.
No save button exists. Data hits the database the moment you interact.

## Running Locally

```bash
docker compose up -d
# Open http://localhost:3000
# Add team members in the Team tab
# Navigate to http://localhost:3000/list/<slug>
```

## Building for StartOS

```bash
make
# Produces ten31-tasks.s9pk
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/team` | List all team members |
| POST | `/api/team` | Add member `{name, slug}` |
| DELETE | `/api/team/:slug` | Remove member + all their data |
| GET | `/api/days/:slug` | All days for a user |
| GET | `/api/days/:slug/:date` | Single day |
| PUT | `/api/days/:slug/:date` | Update day (partial merge) |
| GET | `/api/team/today` | Team board data (all members + recent days) |

## License

MIT
