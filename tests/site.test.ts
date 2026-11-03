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

/** "WxH" of a PNG, or null if it isn't one. */
function pngSize(file: string): string | null {
  const head = readFileSync(file).subarray(0, 24);
  if (head.subarray(1, 4).toString() !== "PNG") return null;
  return `${head.readUInt32BE(16)}x${head.readUInt32BE(20)}`;
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
  ogImage: string | null;
  ogImageAlt: string | null;
  ogImageSize: string | null;
  twitterCard: string | null;
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
    ogImage: null,
    ogImageAlt: null,
    ogImageSize: null,
    twitterCard: null,
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
    .on('meta[property="og:image"]', {
      element(el) {
        page.ogImage = el.getAttribute("content");
      },
    })
    .on('meta[property="og:image:alt"]', {
      element(el) {
        page.ogImageAlt = el.getAttribute("content");
      },
    })
    .on('meta[property="og:image:width"], meta[property="og:image:height"]', {
      element(el) {
        page.ogImageSize = [page.ogImageSize, el.getAttribute("content")]
          .filter(Boolean)
          .join("x");
      },
    })
    .on('meta[name="twitter:card"]', {
      element(el) {
        page.twitterCard = el.getAttribute("content");
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

  test("has a large preview image with alt text", () => {
    expect(page.twitterCard).toBe("summary_large_image");
    expect(page.ogImageAlt?.length ?? 0).toBeGreaterThan(5);
    const image = new URL(page.ogImage ?? "");
    expect(image.protocol).toBe("https:");
    const file = distFileFor(image.href);
    if (!file) return;
    expect(existsSync(file), image.href).toBe(true);
    if (page.ogImageSize) {
      expect(pngSize(file)).toBe(page.ogImageSize);
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
  test("is a website, not an article", () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).not.toContain("article:published_time");
  });

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

  test("the CSP lets giscus load its script, styles and frame", () => {
    const directive = (name: string) =>
      csp.match(new RegExp(`(?:^|;)\\s*${name}\\s([^;]*)`))?.[1] ?? "";
    for (const name of ["script-src", "style-src", "frame-src"]) {
      expect(directive(name).split(/\s+/), name).toContain(
        "https://giscus.app",
      );
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

describe.each(["/blog/", ...postSlugs.map((slug) => `/blog/${slug}/`)])(
  "blog page %s",
  (path) => {
    test("its footer's cd ~ links home", () => {
      const html = readFileSync(join(DIST, path, "index.html"), "utf8");
      const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
      expect(footer).toMatch(/<a href="\/"[^>]*>\s*cd ~\s*<\/a>/);
    });
  },
);

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

describe.each(postSlugs)("blog post %s", (slug) => {
  const mdFile = [".md", ".mdx"]
    .map((ext) => join(ROOT, "src/content/blog", `${slug}${ext}`))
    .find((file) => existsSync(file))!;
  const fm =
    readFileSync(mdFile, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ??
    "";
  const html = readFileSync(join(DIST, "blog", slug, "index.html"), "utf8");
  const linkedin = fm.match(/^linkedin:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
  const hasHero = /^hero:/m.test(fm);

  test("links to LinkedIn only when frontmatter sets a url", () => {
    if (linkedin) {
      expect(html).toContain("Discuss on LinkedIn");
      expect(html).toContain(linkedin);
    } else {
      expect(html).not.toContain("Discuss on LinkedIn");
    }
  });

  test("shows a hero image only when frontmatter sets one", () => {
    expect(/class="[^"]*\bpost__hero\b/.test(html)).toBe(hasHero);
  });

  test("inlines an SVG hero with its alt text", () => {
    const src = fm.match(/^hero:\s*\n\s+src:\s*["']?([^"'\n]+)/m)?.[1];
    if (!src?.endsWith(".svg")) return;
    expect(html).toMatch(
      /<figure class="diagram post__hero">\s*<svg aria-label="[^"]{10,}"/,
    );
    expect(html).not.toContain(`<img src="${src}"`);
  });

  test("ends with a link back to the post list", () => {
    expect(html).toMatch(
      /<a href="\/blog" class="post__back-link">\s*cd ~\/blog\s*<\/a>/,
    );
    expect(html).toMatch(
      /<a href="\/blog" class="post__back-hint"[^>]*>\s*# (←|&larr;) All posts\s*<\/a>/,
    );
  });

  test("loads giscus for its slug unless comments are off", () => {
    const off = /^comments:\s*false\s*$/m.test(fm);
    const container = html.match(/<div class="giscus"[^>]*>/)?.[0];
    if (off) {
      expect(container).toBeUndefined();
      return;
    }
    expect(container).toBeDefined();
    expect(container).toContain(`data-term="${slug}"`);
    expect(container).toMatch(/data-repo-id="R_[^"]+"/);
    expect(container).toMatch(/data-category-id="DIC_[^"]+"/);
  });

  test("is an article with its author and publish date", () => {
    const date = fm.match(/^date:\s*(\S+)\s*$/m)![1];
    const iso = new Date(date).toISOString().slice(0, 10);
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta name="author" content="Goran Osim">');
    expect(html).toContain(
      `<meta property="article:published_time" content="${iso}">`,
    );
    expect(html).toMatch(
      new RegExp(`<meta name="publish_date"[^>]*content="${iso}"`),
    );
  });

  test("previews with its ogImage, or else a generated card", () => {
    const page = parsed.get(`/blog/${slug}/`)!;
    const ogSrc = fm.match(/^ogImage:\s*\n\s+src:\s*["']?([^"'\n]+)/m)?.[1];
    const expected = ogSrc ?? `/og/blog/${slug}.png`;
    expect(page.ogImage).toBe(new URL(expected, SITE).href);
    if (!ogSrc) expect(page.ogImageSize).toBe("1200x630");
  });

  test("inlines every SVG diagram with its alt text", () => {
    const body = readFileSync(mdFile, "utf8").slice(fm.length);
    const diagrams = [...body.matchAll(/!\[[^\]]+\]\(\.\/[^)]+\.svg\)/g)];
    const figures = [
      ...html.matchAll(/<figure class="diagram">\s*<svg aria-label="([^"]+)"/g),
    ];
    expect(figures.length).toBe(diagrams.length);
    expect(html).not.toMatch(/<img[^>]+\.svg/);
  });
});

// ---- hidden pages --------------------------------------------------------------

describe("giscus", () => {
  const post = [...parsed].find(([path]) => /^\/blog\/.+\//.test(path))?.[1];
  const config = JSON.parse(readFileSync(join(ROOT, "giscus.json"), "utf8"));

  test("giscus.json only lets this site load the comments", () => {
    expect(config.origins).toEqual([SITE.origin]);
    for (const pattern of config.originsRegex ?? []) {
      expect(new RegExp(pattern).test("https://example.com")).toBe(false);
      expect(new RegExp(pattern).test("http://localhost.evil.com")).toBe(false);
    }
  });

  test("the loader uses strict matching and both Catppuccin themes", () => {
    expect(post).toBeDefined();
    for (const text of [
      'ORIGIN = "https://giscus.app"',
      '"data-mapping": "specific"',
      '"data-strict": "1"',
      "catppuccin_latte",
      "catppuccin_mocha",
      'attributeFilter: ["data-theme"]',
    ]) {
      expect(post!.inlineScripts, text).toContain(text);
    }
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
