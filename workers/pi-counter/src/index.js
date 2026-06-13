async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Crawler / headless / scraper signatures. Hits matching this regex still receive
// the current count but do NOT cause an increment, so they can't inflate the number.
const BOT_UA_RE =
  /bot\b|crawl|spider|slurp|fetch|httpx?|wget|curl|python-requests|aiohttp|axios|node-fetch|libwww|java\/|go-http-client|okhttp|headless|phantom|selenium|playwright|puppeteer|chrome-lighthouse|lighthouse|pagespeed|gpt|claude|anthropic|openai|perplexity|bytespider|ccbot|cohere|diffbot|facebookexternalhit|meta-externalagent|preview|monitor|uptime|pingdom|datadog|newrelic|prerender|scraper/i;

function looksLikeBot(ua) {
  if (!ua) return true; // missing UA → almost always a bot
  return BOT_UA_RE.test(ua);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // GET = read the current count without side effects.
      // POST = increment if this is a new visitor and the UA isn't a bot.
      // The page calls GET on load (so the number appears immediately) and POST
      // only after a real-user interaction (mousemove / scroll / keydown / etc.).
      const isIncrement = request.method === "POST";

      // Get current count
      const countStr = await env.PI_VISITORS.get("count");
      let count = parseInt(countStr) || 0;

      if (isIncrement) {
        const userAgent = request.headers.get("User-Agent") || "";
        const isBot = looksLikeBot(userAgent);

        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const visitorHash = await hashIP(ip);
        const seen = await env.PI_VISITORS.get(`visitor:${visitorHash}`);

        if (!seen && !isBot) {
          count++;
          await env.PI_VISITORS.put("count", count.toString());
          await env.PI_VISITORS.put(`visitor:${visitorHash}`, "1", {
            expirationTtl: 2592000, // 30 days
          });
        }
      }

      return new Response(JSON.stringify({ count }), {
        headers: corsHeaders(origin),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to get count" }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  },
};
