import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { diagramPng } from "../../../lib/diagram-png";
import { bodyDiagrams, heroDiagram } from "../../../lib/feed-html";

const WIDTH = 1200;

export const getStaticPaths = (async () => {
  const posts = await getCollection("blog");
  return posts.flatMap((post) => {
    const hero = heroDiagram(post);
    const diagrams = [...(hero ? [hero] : []), ...bodyDiagrams(post)];
    return diagrams.map((d) => ({
      params: { post: post.id, name: d.name },
      props: { file: d.file },
    }));
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const svg = readFileSync(props.file as string, "utf8");
  return new Response(
    new Uint8Array(diagramPng(svg, WIDTH, { opaque: true })),
    {
      headers: { "Content-Type": "image/png" },
    },
  );
};
