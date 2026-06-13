const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwh5YLI5jXSnGyNWRa_sRQ8lrnhQqryRRtdI9J_J8xbntzDDyx1O_qaw-Hgfh8cZ0tz/exec';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store'
  };
}

async function forwardToGas(request) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(GAS_WEBAPP_URL);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  const init = {
    method: request.method,
    headers,
    redirect: 'follow'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  return fetch(upstreamUrl.toString(), init);
}

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin')) });
  }

  const upstreamResponse = await forwardToGas(request);
  const headers = new Headers(upstreamResponse.headers);
  const origin = request.headers.get('Origin');

  Object.entries(corsHeaders(origin)).forEach(function(entry) {
    headers.set(entry[0], entry[1]);
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers
  });
}

addEventListener('fetch', function(event) {
  event.respondWith(handleRequest(event.request));
});
