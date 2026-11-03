import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

interface ImageNode {
  type: string;
  url?: string;
  alt?: string | null;
}

interface ParagraphNode {
  children: readonly ImageNode[];
}

interface VisitContext {
  fileURL: URL | undefined;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

// Inline SVG follows the theme and fonts.
const plugin = {
  name: "inline-svg-diagrams",
  paragraph(node: ParagraphNode, ctx: VisitContext) {
    const [image, ...rest] = node.children;
    if (rest.length || image?.type !== "image" || !ctx.fileURL) return;
    const url = image.url ?? "";
    if (!url.endsWith(".svg") || /^([a-z]+:|\/)/i.test(url)) return;

    const file = fileURLToPath(new URL(url, ctx.fileURL));
    const svg = readFileSync(file, "utf8")
      .trim()
      .replace(/\n\s*\n/g, "\n")
      .replace("<svg ", `<svg aria-label="${escapeAttr(image.alt ?? "")}" `);
    return { raw: `<figure class="diagram">\n${svg}\n</figure>` };
  },
};

export function inlineDiagrams(): AstroIntegration {
  return {
    name: "inline-svg-diagrams",
    hooks: {
      "astro:config:setup": ({ config }) => {
        const options = config.markdown.processor.options as {
          mdastPlugins?: unknown[];
        };
        options.mdastPlugins?.push(plugin);
      },
    },
  };
}
