import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection, render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { FEED_TITLE, feedHtml } from "../lib/feed-html";

export const GET: APIRoute = async ({ site }) => {
  const posts = (await getCollection("blog")).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);
      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description,
        link: `/blog/${post.id}/`,
        content: feedHtml(post, html, site!),
      };
    }),
  );

  return rss({
    title: FEED_TITLE,
    description: "Posts by Goran Osim.",
    site: site!,
    items,
    customData: "<language>en</language>",
  });
};
