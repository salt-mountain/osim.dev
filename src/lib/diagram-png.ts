import { Resvg } from "@resvg/resvg-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Bundled builds lose import.meta.url's folder.
const font = (weight: 400 | 700) => {
  const file = resolve(`src/lib/fonts/caveat-latin-${weight}-normal.ttf`);
  if (!existsSync(file)) throw new Error(`Missing font: ${file}`);
  return file;
};

const M = {
  base: "#1e1e2e",
  text: "#cdd6f4",
  overlay0: "#6c7086",
  teal: "#94e2d5",
  peach: "#fab387",
  red: "#f38ba8",
  blue: "#89b4fa",
};

/** CSS color-mix(in srgb, a p%, b). */
function mix(a: string, b: string, p: number): string {
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return (
    "#" +
    x
      .map((v, i) => Math.round(v * p + y[i] * (1 - p)))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Mirrors the .d-* rules in global.css, Mocha.
const STYLE = `
text { font-family: Caveat; }
.d-ink { color: ${M.text}; }
.d-muted { color: ${M.overlay0}; }
.d-net { color: ${M.teal}; }
.d-host { color: ${M.peach}; }
.d-block { color: ${M.red}; }
.d-link { color: ${M.blue}; }
.d-fill-net { color: ${mix(M.teal, M.base, 0.16)}; }
.d-fill-host { color: ${mix(M.peach, M.base, 0.14)}; }
.d-fill-block { color: ${mix(M.red, M.base, 0.14)}; }
.d-badge { fill: ${M.base}; }
.d-t1 { fill: ${M.text}; font-size: 23px; font-weight: 700; }
.d-t2 { fill: ${M.text}; font-size: 18px; font-weight: 700; }
.d-t3 { fill: ${M.text}; font-size: 20px; font-weight: 700; }
.d-lbl { fill: ${mix(M.text, M.base, 0.8)}; font-size: 19px; font-weight: 700; }
.d-lbl-net { fill: ${M.teal}; font-size: 19px; font-weight: 700; }
.d-lbl-block { fill: ${M.red}; font-size: 19px; font-weight: 700; }
.d-grp { fill: ${M.peach}; font-size: 20px; font-weight: 700; }
`;

/** A diagram SVG drawn as a Mocha PNG. */
export function diagramPng(svg: string, width: number): Uint8Array {
  const themed = svg.replace(/(<svg[^>]*>)/, `$1<style>${STYLE}</style>`);
  return new Resvg(themed, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: [font(400), font(700)],
      loadSystemFonts: false,
      defaultFontFamily: "Caveat",
    },
  })
    .render()
    .asPng();
}
