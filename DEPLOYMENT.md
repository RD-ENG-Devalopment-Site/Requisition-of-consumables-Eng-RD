# Deployment Flow

1. Edit code in `work/` root, not only `work/src/`.
2. Run `clasp push --force` from `work/`.
3. In Google Apps Script, open `Deploy > Manage deployments`.
4. Edit the web app deployment and choose `New version`.
5. Redeploy, then refresh the browser with a hard reload.

If the web UI still looks stale, clear site data or unregister the service worker.
