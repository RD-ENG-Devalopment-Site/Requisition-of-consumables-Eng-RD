# API Bridge

This Cloudflare Worker proxies GitHub Pages requests to the Google Apps Script web app.

## Deploy

1. Install Wrangler.
2. Run `wrangler login`.
3. Deploy from this folder with `wrangler deploy`.
4. Copy the Worker URL ending in `/exec`.
5. Paste that URL into `config.js` as `window.APP_CONFIG.apiBaseUrl`.

## Notes

- The worker adds CORS headers so the browser can call it from `github.io`.
- The worker forwards both `GET` and `POST` requests to the Apps Script `/exec` endpoint.
- Keep `GAS_WEBAPP_URL` in `worker.js` aligned with the current Apps Script web app URL.
