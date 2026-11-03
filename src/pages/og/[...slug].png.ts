import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { type Card, renderCard } from "../../lib/og-card";

export const getStaticPaths = (async () => {
  const posts = await getCollection("blog");
  const home: Card = {
    command: "whoami",
    path: "~",
    title: "Goran Osim",
    description:
      "System Development Engineer. I build the platforms that engineers build on.",
  };
  return [
    { params: { slug: "default" }, props: { card: home } },
    ...posts
      .filter((post) => !post.data.ogImage)
      .map((post) => ({
        params: { slug: `blog/${post.id}` },
        props: {
          card: {
            command: `cat ${post.id}.md`,
            path: "~/blog",
            title: post.data.title,
            description: post.data.description,
            footer: post.data.date.toISOString().split("T")[0],
          } satisfies Card,
        },
      })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCard(props.card as Card);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
