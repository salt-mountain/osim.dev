import { readFileSync } from "node:fs";
import { join } from "node:path";
import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";

const gen = rough.generator();

const BASE: Options = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  roughness: 1.4,
  bowing: 1.2,
  seed: 7,
};

export type Color = "ink" | "muted" | "net" | "host" | "block" | "link";
export type Fill = "net" | "host" | "block";
type TextStyle = "t1" | "t2" | "lbl" | "lbl-net" | "lbl-block" | "grp";

export interface Icon {
  viewBox: string;
  body: string;
  stroked?: boolean;
}

const ICON_DIR = join(import.meta.dir, "icons");

/** Logo from diagrams/icons, recoloured to currentColor. */
export function icon(name: string): Icon {
  const svg = readFileSync(join(ICON_DIR, `${name}.svg`), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)![1];
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/(fill|stroke)="#[0-9a-f]{3,6}"/gi, '$1="currentColor"')
    .replace(/\s*\n\s*/g, "");
  return { viewBox, body };
}

export const DEVICE: Icon = {
  viewBox: "0 0 24 24",
  body: '<rect x="2.5" y="5" width="12.5" height="9" rx="1.2"/><path d="M0.8 17h16"/><rect x="17.2" y="8" width="6" height="12" rx="1.6"/>',
  stroked: true,
};

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toSvgPaths(drawable: Drawable, dash?: number[]): string {
  const o = drawable.options;
  const dashAttr = dash ? ` stroke-dasharray="${dash.join(" ")}"` : "";
  return drawable.sets
    .map((set) => {
      const d = gen.opsToPath(set, 1);
      if (set.type === "fillPath") {
        return `<path d="${d}" fill="currentColor" stroke="none"/>`;
      }
      return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${o.strokeWidth}"${dashAttr}/>`;
    })
    .join("");
}

export class Sketch {
  private fills: string[] = [];
  private inks: string[] = [];
  private badges: string[] = [];
  private texts: string[] = [];

  constructor(
    private width: number,
    private height: number,
    private title: string,
  ) {}

  private opts(extra: Options = {}): Options {
    return { ...BASE, ...extra };
  }

  private ink(color: Color, drawable: Drawable, dash?: number[]) {
    this.inks.push(`<g class="d-${color}">${toSvgPaths(drawable, dash)}</g>`);
  }

  private fill(color: Fill, drawable: Drawable) {
    this.fills.push(`<g class="d-fill-${color}">${toSvgPaths(drawable)}</g>`);
  }

  box(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { fill?: Fill; color?: Color; strokeWidth?: number } = {},
  ) {
    if (opts.fill) {
      this.fill(
        opts.fill,
        gen.rectangle(
          x,
          y,
          w,
          h,
          this.opts({
            stroke: "none",
            fill: "currentColor",
            fillStyle: "solid",
            roughness: 1.6,
          }),
        ),
      );
    }
    this.ink(
      opts.color ?? "ink",
      gen.rectangle(
        x,
        y,
        w,
        h,
        this.opts({ strokeWidth: opts.strokeWidth ?? 1.6 }),
      ),
    );
  }

  pill(cx: number, cy: number, w: number, h: number, fill: Fill, color: Color) {
    this.fill(
      fill,
      gen.ellipse(
        cx,
        cy,
        w,
        h,
        this.opts({ stroke: "none", fill: "currentColor", fillStyle: "solid" }),
      ),
    );
    this.ink(color, gen.ellipse(cx, cy, w, h, this.opts({ strokeWidth: 2 })));
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: { color?: Color; dash?: number[]; strokeWidth?: number } = {},
  ) {
    this.ink(
      opts.color ?? "ink",
      gen.line(x1, y1, x2, y2, this.opts({ strokeWidth: opts.strokeWidth })),
      opts.dash,
    );
  }

  arrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: {
      color?: Color;
      dash?: number[];
      strokeWidth?: number;
      both?: boolean;
    } = {},
  ) {
    this.line(x1, y1, x2, y2, opts);
    this.head(x1, y1, x2, y2, opts);
    if (opts.both) this.head(x2, y2, x1, y1, opts);
  }

  private head(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: { color?: Color; strokeWidth?: number },
  ) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const len = 13;
    const spread = 0.45;
    this.ink(
      opts.color ?? "ink",
      gen.linearPath(
        [
          [x2 - len * Math.cos(a - spread), y2 - len * Math.sin(a - spread)],
          [x2, y2],
          [x2 - len * Math.cos(a + spread), y2 - len * Math.sin(a + spread)],
        ],
        this.opts({ strokeWidth: opts.strokeWidth }),
      ),
    );
  }

  cross(cx: number, cy: number, color: Color = "block") {
    this.line(cx - 9, cy - 11, cx + 9, cy + 11, { color, strokeWidth: 2.4 });
    this.line(cx + 9, cy - 11, cx - 9, cy + 11, { color, strokeWidth: 2.4 });
  }

  badge(cx: number, cy: number, logo: Icon, color: Color) {
    const ring = toSvgPaths(
      gen.circle(cx, cy, 30, this.opts({ strokeWidth: 1.4, roughness: 1 })),
    );
    const paint = logo.stroked
      ? 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"'
      : 'fill="currentColor"';
    this.badges.push(
      `<circle class="d-badge" cx="${cx}" cy="${cy}" r="15"/>`,
      `<g class="d-ink">${ring}</g>`,
      `<svg class="d-${color}" x="${cx - 9}" y="${cy - 9}" width="18" height="18" viewBox="${logo.viewBox}" ${paint} aria-hidden="true">${logo.body}</svg>`,
    );
  }

  text(
    style: TextStyle,
    x: number,
    y: number,
    content: string,
    anchor: "start" | "middle" = "middle",
  ) {
    const anchorAttr = anchor === "middle" ? ' text-anchor="middle"' : "";
    this.texts.push(
      `<text class="d-${style}" x="${x}" y="${y}"${anchorAttr}>${escape(content)}</text>`,
    );
  }

  render(): string {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" class="diagram-svg" viewBox="0 0 ${this.width} ${this.height}" role="img">`,
      `<title>${escape(this.title)}</title>`,
      ...this.fills,
      ...this.inks,
      ...this.badges,
      ...this.texts,
      "</svg>",
    ].join("\n");
  }
}
