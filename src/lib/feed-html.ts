import { dirname, resolve } from "node:path";

interface PostLike {
  id: string;
  body?: string;
  filePath?: string;
  data: {
    hero?: { src: string; alt: string };
    linkedin?: string;
    comments?: boolean;
  };
}

export interface DiagramRef {
  name: string;
  file: string;
  alt: string;
}

const SVG_SRC = /^\.\.?\/[^)\s]+\.svg$/;
// Same shape inline-diagrams.ts inlines.
const BODY_SVG = /^!\[([^\]]*)\]\((\.\.?\/[^)\s]+\.svg)\)\s*$/gm;

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function ref(post: PostLike, src: string, alt: string): DiagramRef {
  const file = resolve(dirname(post.filePath!), src);
  const name = src.replace(/^.*\//, "").replace(/\.svg$/, "");
  return { name, file, alt };
}

export const FEED_TITLE = "osim.dev blog";

/** A post body's SVG diagrams, in order. */
export function bodyDiagrams(post: PostLike): DiagramRef[] {
  if (!post.filePath || !post.body) return [];
  return [...post.body.matchAll(BODY_SVG)].map(([, alt, src]) =>
    ref(post, src, alt),
  );
}

/** The post's SVG hero, or null. */
export function heroDiagram(post: PostLike): DiagramRef | null {
  const hero = post.data.hero;
  if (!hero || !post.filePath || !SVG_SRC.test(hero.src)) return null;
  return ref(post, hero.src, hero.alt);
}

/** Site path of a diagram's feed PNG. */
export function diagramPngPath(postId: string, name: string): string {
  return `/feed/${postId}/${name}.png`;
}

// Readers drop inline SVG and relative links.
export function feedHtml(post: PostLike, html: string, site: URL): string {
  const postUrl = new URL(`/blog/${post.id}/`, site).href;
  const img = (d: DiagramRef) =>
    `<figure><img src="${new URL(diagramPngPath(post.id, d.name), site).href}" alt="${escapeAttr(d.alt)}"></figure>`;

  const diagrams = bodyDiagrams(post);
  const figures = html.match(/<figure class="diagram">[\s\S]*?<\/figure>/g);
  if ((figures?.length ?? 0) !== diagrams.length) {
    throw new Error(
      `${post.id}: ${figures?.length ?? 0} inline diagrams, ${diagrams.length} in the Markdown`,
    );
  }
  let i = 0;
  let out = html.replace(/<figure class="diagram">[\s\S]*?<\/figure>/g, () =>
    img(diagrams[i++]),
  );

  out = out
    .replace(/(href|src)="\/(?!\/)/g, `$1="${site.origin}/`)
    .replace(/href="#/g, `href="${postUrl}#`);

  const hero = heroDiagram(post);
  if (hero) out = img(hero) + "\n" + out;

  const footer: string[] = [];
  if (post.data.comments !== false) {
    footer.push(`<a href="${postUrl}#comments">Comment on this post</a>`);
  }
  if (post.data.linkedin) {
    footer.push(
      `<a href="${escapeAttr(post.data.linkedin)}">Discuss on LinkedIn</a>`,
    );
  }
  if (footer.length) out += `\n<hr>\n<p>${footer.join(" · ")}</p>`;
  return out;
}
