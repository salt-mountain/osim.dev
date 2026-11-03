import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface PostLike {
  filePath?: string;
  data: { hero?: { src: string; alt: string } };
}

/** A post's hero SVG markup, or null for other heroes. */
export function heroSvg(post: PostLike): string | null {
  const src = post.data.hero?.src;
  if (!src || !post.filePath || !/^\.\.?\/.+\.svg$/.test(src)) return null;
  return readFileSync(resolve(dirname(post.filePath), src), "utf8").trim();
}
