async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Get visitor IP and hash it
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const visitorHash = await hashIP(ip);

      // Check if this visitor has been seen
      const seen = await env.PI_VISITORS.get(`visitor:${visitorHash}`);

      // Get current count
      const countStr = await env.PI_VISITORS.get('count');
      let count = parseInt(countStr) || 0;

      // If new visitor, increment and store hash (30 day TTL)
      if (!seen) {
        count++;
        await env.PI_VISITORS.put('count', count.toString());
        await env.PI_VISITORS.put(`visitor:${visitorHash}`, '1', {
          expirationTtl: 2592000, // 30 days
        });
      }

      return new Response(JSON.stringify({ count }), {
        headers: corsHeaders(origin),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to get count' }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  },
};
