// ESPN's public site API has no CORS headers, so the browser can't call it
// directly — this forwards the request server-side (where CORS doesn't
// apply) and adds our own permissive header. ESPN's endpoint is a widely
// used, unauthenticated public API (unlike X's syndication endpoint) so it
// isn't rate-limit-fragile the way a proxy for that was.
const ALLOWED_PREFIX = '/apis/';

export const handler = async (event) => {
  const path = event.queryStringParameters?.path;
  if (!path || !path.startsWith(ALLOWED_PREFIX)) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'invalid path' }) };
  }
  try {
    const res = await fetch(`https://site.api.espn.com${path}`);
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
