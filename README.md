# All Files Convertor

All Files Convertor is a privacy-first file conversion web app. It is built as a small monorepo:

- `apps/web` - Next.js App Router frontend
- `apps/api` - FastAPI conversion backend

## Local Development

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
TEMP_STORAGE=local uvicorn main:app --reload --port 8000
```

```bash
cd apps/web
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` for local frontend-to-backend calls.
Set `ANALYTICS_PATH=/tmp/all_files_convertor_analytics.json` locally, or point it at persistent storage in production so customer conversion counts survive deploys/restarts.

## Current Local Limits

- `MAX_FILE_MB=100` per file
- `MAX_BATCH_FILES=20` files per batch
- `MAX_BATCH_MB=250` total upload size per batch
- `MAX_OUTPUT_MB=500` total converted output size
- `BATCH_CONCURRENCY=3` active conversions per batch
- `CLEANUP_TTL_MINUTES=10` before completed jobs expire
- `TEMP_FILE_TTL_MINUTES=60` before abandoned conversion temp folders are purged
- `CLEANUP_INTERVAL_SECONDS=300` between cleanup passes

Multiple files can be downloaded as separate converted files in a ZIP, or merged into one PDF when the destination format is PDF.

## Rate Limiting and IP Retention

The API applies an in-memory IP rate limit by default:

- `RATE_LIMIT_REQUESTS=30` requests
- `RATE_LIMIT_WINDOW_SECONDS=60` seconds
- `RATE_LIMIT_RETENTION_HOURS=24` hours before inactive IP entries are purged
- `RATE_LIMIT_BACKEND=memory` locally, `redis` in production
- `TRUST_PROXY_HEADERS=false` unless the API is behind a trusted proxy/CDN

Only the client IP and request timestamps are kept for rate limiting. The Redis limiter hashes the IP before storing the key and expires it within the configured retention window.

## Production and QA

- Production checklist: `docs/PRODUCTION_READINESS.md`
- Release QA matrix: `docs/QA_MATRIX.md`
