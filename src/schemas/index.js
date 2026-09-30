const { z } = require('zod');

const ScrapeModeSchema = z.enum(['main_content', 'redesign_context', 'product']);

const SelectorSchema = z.string().trim().max(300).optional();

const ProductSelectorsSchema = z.object({
  name: SelectorSchema,
  price: SelectorSchema,
  currency: SelectorSchema,
  availability: SelectorSchema,
  brand: SelectorSchema,
  sku: SelectorSchema,
  description: SelectorSchema,
  image: SelectorSchema,
  rating: SelectorSchema,
  reviewCount: SelectorSchema,
  category: SelectorSchema,
}).partial().optional();

const ScrapeRequestSchema = z.object({
  url: z.string().url(),
  mode: ScrapeModeSchema,
  forceRender: z.boolean().optional(),
  selectors: ProductSelectorsSchema,
  output: z.enum(['name_price', 'full']).optional()
});

const CrawlRequestSchema = z.object({
  seedUrl: z.string().url(),
  mode: ScrapeModeSchema,
  maxPages: z.coerce.number().min(1).default(25),
  maxDepth: z.coerce.number().min(0).default(2),
  includePatterns: z.string().optional(),
  excludePatterns: z.string().optional(),
  selectors: ProductSelectorsSchema,
  output: z.enum(['name_price', 'full']).optional()
});

module.exports = {
  ScrapeModeSchema,
  ScrapeRequestSchema,
  CrawlRequestSchema
};
