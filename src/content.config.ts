import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string().optional(),
    // Top-of-post image; link-preview card. No fallback between them.
    hero: z.object({ src: z.string(), alt: z.string() }).optional(),
    ogImage: z.object({ src: z.string(), alt: z.string() }).optional(),
    linkedin: z.string().url().optional(),
    comments: z.boolean().optional(),
  }),
});

export const collections = { blog };
