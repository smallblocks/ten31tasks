# ─── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app

RUN npm init -y && \
    npm install --legacy-peer-deps vite@5 @vitejs/plugin-react react react-dom

COPY <<'VITECONFIG' vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
VITECONFIG

COPY <<'HTMLSHELL' index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <meta name="theme-color" content="#0c0b09"/>
  <title>Ten31 Tasks</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0c0b09; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
HTMLSHELL

COPY frontend/src/main.jsx src/main.jsx
COPY frontend/src/App.jsx src/App.jsx

RUN npx vite build

# ─── Stage 2: Runtime — Python + nginx + supervisord ────────────────────────
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl && \
    rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Backend
COPY backend/main.py /app/main.py

# Frontend static files
COPY --from=frontend-build /app/dist /var/www/html

# Nginx config
COPY startos/nginx.conf /etc/nginx/sites-available/default

# Supervisord config
COPY <<'SUPERVISOR' /etc/supervisor/conf.d/ten31.conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0

[program:uvicorn]
command=uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=DB_PATH="/data/ten31-tasks.db"

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
SUPERVISOR

# Data volume
RUN mkdir -p /data

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
