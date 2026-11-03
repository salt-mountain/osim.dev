import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderSaltrss } from "./saltrss";

export const OUT_DIR = join(import.meta.dir, "../src/content/blog/diagrams");

export function renderAll(): Record<string, string> {
  return { ...renderSaltrss() };
}

if (import.meta.main) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, svg] of Object.entries(renderAll())) {
    writeFileSync(join(OUT_DIR, name), `${svg}\n`);
    console.log(`wrote ${name}`);
  }
}
