// Optional external bridge endpoint.
// Leave blank to use the built-in Apps Script bridge path from GitHub Pages.
// Example: window.APP_CONFIG.apiBaseUrl = 'https://your-worker.workers.dev/exec';
var APP_CONFIG = (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : { apiBaseUrl: '' };
if (typeof window !== 'undefined') {
  window.APP_CONFIG = window.APP_CONFIG || APP_CONFIG;
}
