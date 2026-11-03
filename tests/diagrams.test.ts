/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR, renderAll } from "../diagrams/generate";
import { diagramPng } from "../src/lib/diagram-png";

describe("diagramPng", () => {
  test("draws diagram text with the Caveat font", () => {
    const svg = (text: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40"><text class="d-t1" x="10" y="30">${text}</text></svg>`;
    const blank = Buffer.from(diagramPng(svg(""), 200));
    const drawn = Buffer.from(diagramPng(svg("caught up"), 200));
    expect(drawn.equals(blank)).toBe(false);
  });
});

const rendered = Object.entries(renderAll());

describe.each(rendered)("diagram %s", (name, svg) => {
  const committed = readFileSync(join(OUT_DIR, name), "utf8");

  test("matches the generator (run `bun run diagrams`)", () => {
    expect(committed).toBe(`${svg}\n`);
  });

  test("has a title and no blank lines", () => {
    expect(committed).toMatch(/<title>[^<]{10,}<\/title>/);
    // Blank lines end Markdown's HTML block.
    expect(committed).not.toMatch(/\n\s*\n./);
  });

  test("doesn't publish server details", () => {
    const text = [...committed.matchAll(/<(?:text|title)[^>]*>([^<]*)</g)]
      .map((m) => m[1])
      .join("\n");
    expect(text).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    expect(text).not.toMatch(/\bssh\b|\bport\b|ufw|iptables/i);
  });
});
