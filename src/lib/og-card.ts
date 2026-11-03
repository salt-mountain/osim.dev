import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { CARD_HEIGHT, CARD_WIDTH } from "./og-size";

export interface Card {
  command: string;
  path: string;
  title: string;
  description?: string;
  footer?: string;
}

// Catppuccin Mocha, matching the dark theme.
const C = {
  crust: "#11111b",
  mantle: "#181825",
  base: "#1e1e2e",
  surface0: "#313244",
  surface1: "#45475a",
  overlay0: "#6c7086",
  subtext0: "#a6adc8",
  text: "#cdd6f4",
  green: "#a6e3a1",
  greenBg: "#2a3e2e",
  sky: "#89dceb",
  yellow: "#f9e2af",
  red: "#f38ba8",
  blue: "#89b4fa",
};

interface Node {
  type: string;
  props: { style?: Record<string, unknown>; children?: unknown };
}

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): Node {
  return { type, props: { style, children } };
}

const require = createRequire(import.meta.url);
const font = (weight: 400 | 700) =>
  readFileSync(
    require.resolve(
      `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-normal.woff`,
    ),
  );

let fonts: { name: string; data: Buffer; weight: 400 | 700 }[] | undefined;

function segment(text: string, bg: string, color: string): Node {
  return el(
    "div",
    { display: "flex", padding: "6px 18px", background: bg, color },
    text,
  );
}

function layout(card: Card): Node {
  const titleSize = card.title.length > 48 ? 56 : 68;
  const dots = [C.red, C.yellow, C.green].map((color) =>
    el("div", {
      width: 18,
      height: 18,
      borderRadius: 9,
      background: color,
      marginRight: 10,
    }),
  );

  return el(
    "div",
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      background: C.crust,
      fontFamily: "JetBrains Mono",
    },
    el(
      "div",
      {
        display: "flex",
        flexDirection: "column",
        width: CARD_WIDTH - 80,
        height: CARD_HEIGHT - 80,
        background: C.base,
        border: `2px solid ${C.surface1}`,
        borderRadius: 16,
        overflow: "hidden",
      },
      [
        el(
          "div",
          {
            display: "flex",
            alignItems: "center",
            height: 56,
            padding: "0 24px",
            background: C.mantle,
            borderBottom: `2px solid ${C.surface0}`,
          },
          [
            el("div", { display: "flex", width: 160 }, dots),
            el(
              "div",
              {
                display: "flex",
                flexGrow: 1,
                justifyContent: "center",
                fontSize: 22,
                color: C.overlay0,
              },
              `osim@dev:${card.path}`,
            ),
            el("div", { display: "flex", width: 160 }),
          ],
        ),
        el(
          "div",
          {
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "40px 56px 36px",
          },
          [
            el("div", { display: "flex", fontSize: 24 }, [
              segment("osim@dev", C.greenBg, C.green),
              segment(card.path, C.surface1, C.sky),
              segment(card.command, C.surface0, C.yellow),
            ]),
            el(
              "div",
              {
                display: "flex",
                marginTop: 44,
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.15,
                color: C.text,
                lineClamp: 3,
              },
              card.title,
            ),
            card.description
              ? el(
                  "div",
                  {
                    display: "flex",
                    marginTop: 24,
                    fontSize: 30,
                    lineHeight: 1.4,
                    color: C.subtext0,
                    lineClamp: 2,
                  },
                  card.description,
                )
              : null,
            el(
              "div",
              {
                display: "flex",
                marginTop: "auto",
                justifyContent: "space-between",
                fontSize: 26,
              },
              [
                el("div", { display: "flex", color: C.blue }, "osim.dev"),
                el(
                  "div",
                  { display: "flex", color: C.overlay0 },
                  card.footer ?? "",
                ),
              ],
            ),
          ],
        ),
      ],
    ),
  );
}

/** A 1200x630 PNG preview card. */
export async function renderCard(card: Card): Promise<Uint8Array> {
  fonts ??= [
    { name: "JetBrains Mono", data: font(400), weight: 400 },
    { name: "JetBrains Mono", data: font(700), weight: 700 },
  ];
  const svg = await satori(layout(card) as never, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts,
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } })
    .render()
    .asPng();
}
