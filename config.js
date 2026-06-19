// Optional external bridge endpoint.
// Leave blank to use the built-in Apps Script bridge path from GitHub Pages.
// Example: window.APP_CONFIG.apiBaseUrl = 'https://your-worker.workers.dev/exec';
var APP_CONFIG = (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : {
  apiBaseUrl: 'https://requisition-consumables-api.requisition-rd.workers.dev/api/compat'
};
if (typeof window !== 'undefined') {
  window.APP_CONFIG = window.APP_CONFIG || APP_CONFIG;
}

// App display settings used by app.js / index rendering.
// Keep a safe fallback so login -> dashboard does not break if a field is missing.
var APP_SETTINGS = (typeof window !== 'undefined' && window.APP_SETTINGS) ? window.APP_SETTINGS : {
  appName: APP_CONFIG.appName || APP_CONFIG.app_name || 'Requisition of consumables (Eng-RD) System',
  appVersion: APP_CONFIG.appVersion || APP_CONFIG.app_version || '3.09',
  appLogo: APP_CONFIG.appLogo || APP_CONFIG.app_logo || ''
};
if (typeof window !== 'undefined') {
  window.APP_SETTINGS = window.APP_SETTINGS || APP_SETTINGS;
}
