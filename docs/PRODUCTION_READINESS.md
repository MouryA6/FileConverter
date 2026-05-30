# All Files Convertor Production Readiness

This checklist covers the production-facing configuration that should be completed before deployment.

## Environment

- `NEXT_PUBLIC_SITE_URL` must be the canonical production site URL, for example `https://allfilesconvertor.com`.
- `FRONTEND_URL` must be the exact production origin for CORS.
- `NEXT_PUBLIC_API_URL` must point at the deployed API origin or internal proxy.
- `SENTRY_DSN` should be set for API errors.
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` should match the production domain when analytics are enabled.
- `NEXT_PUBLIC_ADSENSE_CLIENT` should only be set after the site is approved for ads.

## Rate Limiting

Local development uses `RATE_LIMIT_BACKEND=memory`.

Production should use:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BACKEND=redis
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_RETENTION_HOURS=24
REDIS_URL=redis://...
```

Use Redis or Upstash so all API instances share the same counters. The Redis limiter stores a hashed IP key and request timestamps, then expires each key within the configured retention window.

Set `TRUST_PROXY_HEADERS=true` only when the API is behind a trusted proxy or CDN that controls `CF-Connecting-IP` or `X-Forwarded-For`.

## Storage

MVP/local mode can use `TEMP_STORAGE=local`, which writes files to the OS temp directory and relies on download cleanup plus periodic cleanup.

Production options:

- Single API instance: local ephemeral disk is acceptable if the host has enough temp storage and jobs do not move between instances.
- Multiple API instances: use shared object storage, such as S3-compatible storage, or route each job to the same instance until download.
- Large traffic: use S3-compatible storage with lifecycle policies and keep `TEMP_FILE_TTL_MINUTES` conservative.

The current job tracker is in memory, so run one API worker per container until job state is moved to Redis or a database.

## Cleanup

Recommended defaults:

```env
CLEANUP_TTL_MINUTES=10
TEMP_FILE_TTL_MINUTES=60
CLEANUP_INTERVAL_SECONDS=300
```

Completed jobs are removed after the job TTL. Abandoned conversion temp folders are purged by the periodic cleanup loop.

## Observability

- Enable Sentry with `SENTRY_DSN`.
- Track conversion failures by source format, target format, and sanitized filename only.
- Do not log file contents, raw uploads, or downloaded output.
- Monitor API CPU, memory, temp disk usage, Redis latency, and conversion duration.

## Security

- Keep `MAX_FILE_MB`, `MAX_BATCH_FILES`, `MAX_BATCH_MB`, and `MAX_OUTPUT_MB` set.
- Keep MIME and extension checks enabled.
- Keep filename sanitization enabled before writing output names.
- Run conversion workers as a non-root user.
- Keep LibreOffice and conversion libraries patched.
- Do not trust proxy IP headers unless the proxy boundary is controlled.

## SEO Launch Checks

- Visit `/robots.txt` and confirm `/api/` is disallowed.
- Visit `/sitemap.xml` and confirm the homepage, legal pages, API docs, and conversion landing pages are listed.
- Confirm canonical URLs use `NEXT_PUBLIC_SITE_URL`.
- Confirm conversion pages do not claim unlimited usage beyond the configured service limits.
- Submit `/sitemap.xml` in Google Search Console after production DNS is live.
