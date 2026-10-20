/// <reference types="bun" />
/**
 * Unit tests for the Cloudflare Workers in workers/.
 *
 * The Workers are deployed by hand, so nothing else checks them. These call
 * each Worker's fetch handler directly with a fake KV namespace and, for the
 * Spotify Worker, a fake `fetch`: nothing reaches Cloudflare or Spotify.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import piCounter from "../workers/pi-counter/src/index.js";
import spotify from "../workers/spotify/src/index.js";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** An in-memory stand-in for a Workers KV namespace. */
class FakeKV {
  values = new Map<string, string>();
  ttls = new Map<string, number | undefined>();
  failing = false;

  async get(key: string, type?: "json") {
    if (this.failing) throw new Error("KV unavailable");
    const value = this.values.get(key) ?? null;
    return type === "json" && value !== null ? JSON.parse(value) : value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    if (this.failing) throw new Error("KV unavailable");
    this.values.set(key, value);
    this.ttls.set(key, options?.expirationTtl);
  }
}

function request(
  method: string,
  { ua = BROWSER_UA, ip = "203.0.113.1", origin = "https://osim.dev" } = {},
) {
  const headers = new Headers({ Origin: origin, "CF-Connecting-IP": ip });
  if (ua) headers.set("User-Agent", ua);
  return new Request("https://worker.test/", { method, headers });
}

// ---- pi-counter ----------------------------------------------------------------

describe("pi-counter Worker", () => {
  let kv: FakeKV;
  const call = (req: Request) => piCounter.fetch(req, { PI_VISITORS: kv });
  const count = async (res: Response) => ((await res.json()) as any).count;

  beforeEach(() => {
    kv = new FakeKV();
    kv.values.set("count", "41");
  });

  test("GET returns the count without changing it", async () => {
    const res = await call(request("GET"));
    expect(res.status).toBe(200);
    expect(await count(res)).toBe(41);
    expect(kv.values.get("count")).toBe("41");
  });

  test("GET returns 0 before anyone has visited", async () => {
    kv.values.clear();
    expect(await count(await call(request("GET")))).toBe(0);
  });

  test("POST counts a new visitor once", async () => {
    expect(await count(await call(request("POST")))).toBe(42);
    expect(await count(await call(request("POST")))).toBe(42);
    expect(kv.values.get("count")).toBe("42");
  });

  test("POST counts different visitors separately", async () => {
    await call(request("POST", { ip: "203.0.113.1" }));
    const res = await call(request("POST", { ip: "203.0.113.2" }));
    expect(await count(res)).toBe(43);
  });

  test("stores a hash of the visitor's IP, not the IP, for 30 days", async () => {
    await call(request("POST", { ip: "203.0.113.1" }));
    const keys = [...kv.values.keys()].filter((key) =>
      key.startsWith("visitor:"),
    );
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^visitor:[0-9a-f]{64}$/);
    expect(keys[0]).not.toContain("203.0.113.1");
    expect(kv.ttls.get(keys[0])).toBe(30 * 24 * 60 * 60);
  });

  test.each([
    ["curl", "curl/8.7.1"],
    ["a search crawler", "Mozilla/5.0 (compatible; Googlebot/2.1)"],
    ["a headless browser", "Mozilla/5.0 HeadlessChrome/126.0"],
    ["an AI crawler", "Mozilla/5.0 (compatible; ClaudeBot/1.0)"],
    ["no user agent", ""],
  ])("POST from %s doesn't count", async (_, ua) => {
    const res = await call(request("POST", { ua }));
    expect(await count(res)).toBe(41);
    expect(kv.values.get("count")).toBe("41");
  });

  test("answers CORS preflight for the calling origin", async () => {
    const res = await call(request("OPTIONS"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://osim.dev",
    );
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  test.each(["PUT", "DELETE", "PATCH"])("rejects %s", async (method) => {
    const res = await call(request(method));
    expect(res.status).toBe(405);
    expect(kv.values.get("count")).toBe("41");
  });

  test("returns a 500 error without details when KV fails", async () => {
    kv.failing = true;
    const res = await call(request("GET"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to get count" });
  });
});

// ---- spotify -------------------------------------------------------------------

describe("spotify Worker", () => {
  const realFetch = globalThis.fetch;
  let kv: FakeKV;
  let calls: { url: string; init?: RequestInit }[];
  const env = () => ({
    CACHE: kv,
    CACHE_TTL: "60",
    SPOTIFY_CLIENT_ID: "test-client-id",
    SPOTIFY_CLIENT_SECRET: "test-client-secret",
    SPOTIFY_REFRESH_TOKEN: "test-refresh-token",
  });
  const call = (req: Request) => spotify.fetch(req, env());

  const spotifyTrack = (name: string) => ({
    name,
    artists: [
      {
        name: "Artist A",
        external_urls: { spotify: "https://open.spotify.com/artist/a" },
      },
      {
        name: "Artist B",
        external_urls: { spotify: "https://open.spotify.com/artist/b" },
      },
    ],
    external_urls: { spotify: `https://open.spotify.com/track/${name}` },
    preview_url: null,
  });

  /** Replace fetch with canned Spotify responses, keyed by URL prefix. */
  function mockSpotify(responses: Record<string, () => Response>) {
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input);
      calls.push({ url, init });
      const match = Object.keys(responses).find((prefix) =>
        url.startsWith(prefix),
      );
      if (!match) throw new Error(`unexpected fetch: ${url}`);
      return responses[match]();
    }) as typeof fetch;
  }

  const token = () => Response.json({ access_token: "test-access-token" });
  const NOW = "https://api.spotify.com/v1/me/player/currently-playing";
  const RECENT = "https://api.spotify.com/v1/me/player/recently-played";
  const TOKEN = "https://accounts.spotify.com/api/token";

  beforeEach(() => {
    kv = new FakeKV();
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("serves a cached track without calling Spotify", async () => {
    const cached = { is_playing: true, track: "Cached", artist: "Someone" };
    kv.values.set("now-playing", JSON.stringify(cached));
    mockSpotify({});
    const res = await call(request("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cached);
    expect(calls).toEqual([]);
  });

  test("returns the playing track and caches it for CACHE_TTL seconds", async () => {
    mockSpotify({
      [TOKEN]: token,
      [NOW]: () =>
        Response.json({ is_playing: true, item: spotifyTrack("Live") }),
    });
    const res = await call(request("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      is_playing: true,
      track: "Live",
      artist: "Artist A, Artist B",
      track_url: "https://open.spotify.com/track/Live",
      artist_url: "https://open.spotify.com/artist/a",
      preview_url: null,
    });
    expect(JSON.parse(kv.values.get("now-playing")!)).toEqual(body);
    expect(kv.ttls.get("now-playing")).toBe(60);
  });

  test("refreshes the access token with the configured credentials", async () => {
    mockSpotify({
      [TOKEN]: token,
      [NOW]: () =>
        Response.json({ is_playing: true, item: spotifyTrack("Live") }),
    });
    await call(request("GET"));
    const tokenCall = calls.find((c) => c.url === TOKEN)!;
    expect(tokenCall.init?.method).toBe("POST");
    const params = new URLSearchParams(String(tokenCall.init?.body));
    expect(params.get("grant_type")).toBe("refresh_token");
    expect(params.get("refresh_token")).toBe("test-refresh-token");
    expect(params.get("client_id")).toBe("test-client-id");
    const nowCall = calls.find((c) => c.url === NOW)!;
    expect(new Headers(nowCall.init?.headers).get("Authorization")).toBe(
      "Bearer test-access-token",
    );
  });

  test("falls back to the last played track when nothing is playing", async () => {
    mockSpotify({
      [TOKEN]: token,
      [NOW]: () => new Response(null, { status: 204 }),
      [RECENT]: () =>
        Response.json({ items: [{ track: spotifyTrack("Earlier") }] }),
    });
    const res = await call(request("GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.is_playing).toBe(false);
    expect(body.track).toBe("Earlier");
  });

  test("returns 404 when Spotify has no track at all", async () => {
    mockSpotify({
      [TOKEN]: token,
      [NOW]: () => new Response(null, { status: 204 }),
      [RECENT]: () => Response.json({ items: [] }),
    });
    const res = await call(request("GET"));
    expect(res.status).toBe(404);
    expect(kv.values.has("now-playing")).toBe(false);
  });

  test("returns a 500 error without details when Spotify is unreachable", async () => {
    mockSpotify({
      [TOKEN]: () => {
        throw new Error("network down");
      },
    });
    const res = await call(request("GET"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch track" });
  });

  test("answers CORS preflight for the calling origin", async () => {
    const res = await call(request("OPTIONS"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://osim.dev",
    );
  });

  test.each(["POST", "PUT", "DELETE"])("rejects %s", async (method) => {
    mockSpotify({});
    const res = await call(request(method));
    expect(res.status).toBe(405);
    expect(calls).toEqual([]);
  });
});
