import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string(),
    targetKeyword: z.string(),
    featured: z.boolean().default(false),
    image: z.string(),
    imageAlt: z.string(),
    readingTime: z.string(),
  }),
});

export const collections = { blog };
