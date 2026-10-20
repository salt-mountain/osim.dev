/// <reference types="bun" />
/**
 * Smoke tests for the built site in dist/.
 *
 * Dependency updates merge and deploy automatically once CI is green, so the
 * build succeeding isn't enough: these check that what it produced is a
 * working site. Expectations come from the sources the pages are built from
 * (src/content/blog, astro.config.mjs, workers/*\/wrangler.toml), so adding a
 * post or editing copy doesn't break a test, but a toolchain update that drops
 * pages, styles, fonts or crawler files does.
 *
 * Run after a build: `bun run build && bun run test`.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist");
const SITE = new URL("https://osim.dev");

if (!existsSync(join(DIST, "index.html"))) {
  throw new Error(
    "dist/index.html not found. These tests check the built site: run `bun run build` first.",
  );
}

// ---- helpers -----------------------------------------------------------------

/** Every built HTML page, as a site path ("/", "/blog/"). */
function builtPages(dir = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return builtPages(full);
    if (entry.name !== "index.html") return [];
    const rel = relative(DIST, dir);
    return [rel ? `/${rel}/` : "/"];
  });
}

/** The dist/ file a same-site URL is served from, or null if it's off-site. */
function distFileFor(url: string, base: URL = SITE): string | null {
  const resolved = new URL(url, base);
  if (resolved.origin !== SITE.origin) return null;
  const path = decodeURIComponent(resolved.pathname);
  // Cloudflare Pages serves /x from x, x.html or x/index.html.
  for (const candidate of [
    path,
    `${path}.html`,
    `${path}/index.html`,
    `${path}index.html`,
  ]) {
    const file = join(DIST, candidate);
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return join(DIST, path); // a path that doesn't exist, for the error message
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

interface Page {
  lang: string | null;
  title: string;
  description: string | null;
  robots: string | null;
  ogUrl: string | null;
  text: string;
  /** Every URL the page loads or links to, with the attribute it came from. */
  refs: { attr: string; url: string }[];
  /** Links that open a new tab, with their rel attribute. */
  newTabLinks: { href: string; rel: string }[];
  ids: Set<string>;
  stylesheets: string[];
  inlineScripts: string;
}

async function parseHtml(file: string): Promise<Page> {
  const html = readFileSync(file, "utf8");
  const page: Page = {
    lang: null,
    title: "",
    description: null,
    robots: null,
    ogUrl: null,
    text: "",
    refs: [],
    newTabLinks: [],
    ids: new Set(),
    stylesheets: [],
    inlineScripts: "",
  };

  await new HTMLRewriter()
    .on("html", {
      element(el) {
        page.lang = el.getAttribute("lang");
      },
    })
    .on("title", {
      text(chunk) {
        page.title += chunk.text;
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        page.description = el.getAttribute("content");
      },
    })
    .on('meta[name="robots"]', {
      element(el) {
        page.robots = el.getAttribute("content");
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        page.ogUrl = el.getAttribute("content");
      },
    })
    .on('link[rel="stylesheet"]', {
      element(el) {
        const href = el.getAttribute("href");
        if (href) page.stylesheets.push(href);
      },
    })
    .on("[src]", {
      element(el) {
        page.refs.push({ attr: "src", url: el.getAttribute("src")! });
      },
    })
    .on("[href]", {
      element(el) {
        const href = el.getAttribute("href")!;
        if (/^(mailto:|tel:|data:)/.test(href)) return;
        page.refs.push({ attr: "href", url: href });
        if (el.getAttribute("target") === "_blank") {
          page.newTabLinks.push({ href, rel: el.getAttribute("rel") ?? "" });
        }
      },
    })
    .on("[id]", {
      element(el) {
        page.ids.add(el.getAttribute("id")!);
      },
    })
    .on("script:not([src])", {
      text(chunk) {
        page.inlineScripts += chunk.text;
      },
    })
    .on("body", {
      text(chunk) {
        page.text += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();

  page.title = decodeEntities(page.title).trim();
  // Collapse whitespace so copy that wraps across lines still matches.
  page.text = decodeEntities(page.text).replace(/\s+/g, " ");
  return page;
}

const pages = builtPages().sort();
const parsed = new Map<string, Page>();
for (const path of pages) {
  parsed.set(path, await parseHtml(join(DIST, path, "index.html")));
}
const notFound = await parseHtml(join(DIST, "404.html"));
// The 404 page is served at whatever URL was missing; check it like the others.
const allPages: [string, Page][] = [...parsed, ["/404.html", notFound]];
const home = parsed.get("/")!;

/** Blog post slugs, from the same files the content collection loads. */
const postSlugs = [
  ...new Bun.Glob("**/*.{md,mdx}").scanSync(join(ROOT, "src/content/blog")),
]
  .filter((file) => !basename(file).startsWith("_"))
  .map((file) => file.replace(/\.mdx?$/, ""))
  .sort();

/** Pages the sitemap leaves out, from the filter in astro.config.mjs. */
const unlisted = ["/pi/"];

// ---- build output --------------------------------------------------------------

describe("build output", () => {
  test("has every page, a 404 page and the crawler files", () => {
    expect(pages).toEqual(
      [
        "/",
        "/blog/",
        ...postSlugs.map((slug) => `/blog/${slug}/`),
        "/pi/",
      ].sort(),
    );
    for (const file of ["404.html", "robots.txt", "sitemap-index.xml"]) {
      expect(existsSync(join(DIST, file)), `dist/${file}`).toBe(true);
    }
  });

  test("every linked PDF is a real PDF", () => {
    const pdfs = new Set(
      allPages.flatMap(([, page]) =>
        page.refs
          .map((ref) => distFileFor(ref.url))
          .filter((file): file is string => !!file?.endsWith(".pdf")),
      ),
    );
    expect(pdfs.size).toBeGreaterThan(0);
    for (const file of pdfs) {
      expect(readFileSync(file).subarray(0, 5).toString(), file).toBe("%PDF-");
    }
  });
});

// ---- every page ----------------------------------------------------------------

describe.each(allPages)("page %s", (path, page) => {
  test("has a language, a title, a description and its own og:url", () => {
    expect(page.lang).toBe("en");
    expect(page.title.length).toBeGreaterThan(3);
    expect(page.description?.length ?? 0).toBeGreaterThan(10);
    if (path !== "/404.html") {
      expect(page.ogUrl).toBe(new URL(path, SITE).href);
    }
  });

  test("every same-site link and asset exists in dist/", () => {
    const missing = page.refs
      .map((ref) => ({ ...ref, file: distFileFor(ref.url) }))
      .filter((ref) => ref.file && !existsSync(ref.file))
      .map((ref) => `${ref.attr}=${ref.url}`);
    expect(missing).toEqual([]);
  });

  test("every same-site #fragment link points at an element that exists", () => {
    const broken = page.refs
      .filter((ref) => ref.attr === "href" && /#./.test(ref.url))
      .filter((ref) => {
        const url = new URL(ref.url, new URL(path, SITE));
        if (url.origin !== SITE.origin) return false;
        const target =
          url.pathname === path || ref.url.startsWith("#")
            ? page
            : parsed.get(url.pathname.replace(/\/?$/, "/"));
        return !target?.ids.has(decodeURIComponent(url.hash.slice(1)));
      })
      .map((ref) => ref.url);
    expect(broken).toEqual([]);
  });

  test("links that open a new tab don't give the new page access to this one", () => {
    const unsafe = page.newTabLinks
      .filter((link) => !/\bnoopener\b/.test(link.rel))
      .map((link) => link.href);
    expect(unsafe).toEqual([]);
  });

  test("loads compiled CSS with the self-hosted fonts", () => {
    expect(page.stylesheets.length).toBeGreaterThan(0);
    const css = page.stylesheets
      .map((href) => readFileSync(distFileFor(href)!, "utf8"))
      .join("\n");
    // An @import left in the output means the fontsource packages weren't bundled.
    expect(css).not.toMatch(/@import\b/);
    for (const selector of [".terminal-window", ".powerline", ".footer"]) {
      expect(css, selector).toContain(selector);
    }
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)]
      .map((match) => match[1].replace(/["']/g, ""))
      .filter((url) => !url.startsWith("data:"));
    expect(urls.some((url) => url.endsWith(".woff2"))).toBe(true);
    const missing = urls.filter((url) => {
      const file = distFileFor(url);
      return file && !existsSync(file);
    });
    expect(missing).toEqual([]);
  });
});

// ---- home page -----------------------------------------------------------------

describe("home page", () => {
  test("shows the name and the sections the nav links to", () => {
    expect(home.text).toContain("Goran Osim");
    for (const id of ["about", "experience", "tech", "contact"]) {
      expect(home.ids.has(id), `#${id}`).toBe(true);
    }
  });

  test("has contact links and an email address the script can decode", () => {
    const hosts = home.refs
      .map((ref) => new URL(ref.url, SITE).hostname)
      .filter((host) => host !== SITE.hostname);
    expect(hosts).toContain("github.com");
    expect(hosts).toContain("www.linkedin.com");
    expect(home.ids.has("contact-email")).toBe(true);
    const encoded = home.inlineScripts.match(/atob\("([^"]+)"\)/);
    expect(encoded).not.toBeNull();
    expect(atob(encoded![1])).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/i);
  });
});

// ---- Workers -------------------------------------------------------------------

describe("Worker URLs", () => {
  /** The `name` each Worker is deployed under, from its wrangler.toml. */
  const workerName = (dir: string) =>
    readFileSync(join(ROOT, "workers", dir, "wrangler.toml"), "utf8").match(
      /^name\s*=\s*"([^"]+)"/m,
    )![1];

  test.each([
    ["/", "spotify"],
    ["/pi/", "pi-counter"],
  ])("%s calls the %s Worker by its deployed name", (path, dir) => {
    const hosts = [
      ...parsed
        .get(path)!
        .inlineScripts.matchAll(
          /https:\/\/([a-z0-9-]+)\.[a-z0-9-]+\.workers\.dev/g,
        ),
    ].map((match) => match[1]);
    expect(hosts).toContain(workerName(dir));
  });
});

// ---- security headers ----------------------------------------------------------

describe("security headers", () => {
  const headers = readFileSync(join(DIST, "_headers"), "utf8");
  const csp = headers.match(/Content-Security-Policy:(.*)/)?.[1] ?? "";

  test("the CSP lets the widgets reach their Workers", () => {
    expect(csp).toContain("connect-src");
    for (const dir of ["spotify", "pi-counter"]) {
      const name = readFileSync(
        join(ROOT, "workers", dir, "wrangler.toml"),
        "utf8",
      ).match(/^name\s*=\s*"([^"]+)"/m)![1];
      expect(csp, name).toContain(name);
    }
  });

  test("sets the baseline hardening headers", () => {
    for (const h of [
      "X-Content-Type-Options: nosniff",
      "Referrer-Policy: strict-origin-when-cross-origin",
      "Strict-Transport-Security:",
    ]) {
      expect(headers, h).toContain(h);
    }
  });
});

// ---- blog ----------------------------------------------------------------------

describe("blog", () => {
  test("the index links to every post", () => {
    const linked = parsed
      .get("/blog/")!
      .refs.map((ref) => new URL(ref.url, SITE).pathname.replace(/\/?$/, "/"))
      .filter((path) => path.startsWith("/blog/") && path !== "/blog/");
    expect([...new Set(linked)].sort()).toEqual(
      postSlugs.map((slug) => `/blog/${slug}/`),
    );
  });
});

// ---- hidden pages --------------------------------------------------------------

describe("hidden pages", () => {
  test("/pi and the 404 page are marked noindex", () => {
    expect(parsed.get("/pi/")!.robots).toContain("noindex");
    expect(notFound.robots).toContain("noindex");
  });

  test("the 404 page says so and links home", () => {
    expect(notFound.text).toContain("404");
    expect(notFound.refs.some((ref) => ref.url === "/")).toBe(true);
  });
});

// ---- crawler files --------------------------------------------------------------

describe("crawler files", () => {
  const read = (file: string) => readFileSync(join(DIST, file), "utf8");
  const locs = (xml: string) =>
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  test("robots.txt points at a sitemap index that lists real sitemaps", () => {
    const sitemapLine = read("robots.txt").match(/^Sitemap:\s*(\S+)/m);
    expect(sitemapLine).not.toBeNull();
    const index = distFileFor(sitemapLine![1]);
    expect(index && existsSync(index), sitemapLine![1]).toBe(true);
    const indexXml = readFileSync(index!, "utf8");
    expect(indexXml).toContain("<sitemapindex");
    const sitemaps = locs(indexXml);
    expect(sitemaps.length).toBeGreaterThan(0);
    for (const url of sitemaps) {
      const file = distFileFor(url);
      expect(file && existsSync(file), url).toBe(true);
    }
  });

  test("the sitemap lists every built page except the hidden ones", () => {
    const urls = readdirSync(DIST)
      .filter((file) => /^sitemap-\d+\.xml$/.test(file))
      .flatMap((file) => locs(read(file)));
    expect(urls.sort()).toEqual(
      pages
        .filter((path) => !unlisted.includes(path))
        .map((path) => new URL(path, SITE).href)
        .sort(),
    );
  });

  test("robots.txt keeps search engines off /pi", () => {
    const general = read("robots.txt")
      .split(/\n\s*\n/)
      .find((group) => /^User-agent:\s*\*\s*$/m.test(group));
    expect(general).toBeDefined();
    expect(general).toMatch(/^Disallow:\s*\/pi\s*$/m);
  });
});
