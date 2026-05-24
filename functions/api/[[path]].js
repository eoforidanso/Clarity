/**
 * Cloudflare Pages Function — reverse proxy for /api/*
 *
 * Forwards every request under /api/* to the production API server at
 * api.clarity-ehr.com so the browser sees same-origin requests and CORS
 * is never an issue.
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Strip the leading /api and forward to the upstream server
  const upstream = new URL(
    '/api' + url.pathname.replace(/^\/api/, '') + url.search,
    'https://api.clarity-ehr.com'
  );

  // Forward the original request headers (includes cookies)
  const proxyRequest = new Request(upstream.toString(), {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  const response = await fetch(proxyRequest);

  // Copy response headers, but strip CORS headers — the browser is now
  // making same-origin requests so CORS headers would be redundant/confusing.
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');
  responseHeaders.delete('access-control-allow-methods');
  responseHeaders.delete('access-control-allow-headers');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
