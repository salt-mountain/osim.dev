const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function getAccessToken(env) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
      client_id: env.SPOTIFY_CLIENT_ID,
      client_secret: env.SPOTIFY_CLIENT_SECRET,
    }),
  });
  const data = await response.json();
  return data.access_token;
}

async function getNowPlaying(accessToken) {
  const response = await fetch(NOW_PLAYING_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 = nothing playing
  if (response.status === 204) return null;
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.item) return null;

  return {
    is_playing: data.is_playing,
    track: data.item.name,
    artist: data.item.artists.map((a) => a.name).join(', '),
    track_url: data.item.external_urls.spotify,
    artist_url: data.item.artists[0].external_urls.spotify,
    preview_url: data.item.preview_url,
  };
}

async function getRecentlyPlayed(accessToken) {
  const response = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.items || data.items.length === 0) return null;

  const item = data.items[0].track;
  return {
    is_playing: false,
    track: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    track_url: item.external_urls.spotify,
    artist_url: item.artists[0].external_urls.spotify,
    preview_url: item.preview_url,
  };
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
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Check KV cache
    const cached = await env.CACHE.get('now-playing', 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: corsHeaders(origin),
      });
    }

    try {
      const accessToken = await getAccessToken(env);

      // Try currently playing first
      let track = await getNowPlaying(accessToken);

      // Fall back to recently played
      if (!track) {
        track = await getRecentlyPlayed(accessToken);
      }

      if (!track) {
        return new Response(JSON.stringify({ error: 'No track data' }), {
          status: 404,
          headers: corsHeaders(origin),
        });
      }

      // Cache the result
      const ttl = parseInt(env.CACHE_TTL) || 60;
      await env.CACHE.put('now-playing', JSON.stringify(track), {
        expirationTtl: ttl,
      });

      return new Response(JSON.stringify(track), {
        headers: corsHeaders(origin),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to fetch track' }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  },
};
