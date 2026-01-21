const { z } = require('zod');

const ScrapeModeSchema = z.enum(['main_content', 'redesign_context']);

const ScrapeRequestSchema = z.object({
  url: z.string().url(),
  mode: ScrapeModeSchema,
  forceRender: z.boolean().optional()
});

const CrawlRequestSchema = z.object({
  seedUrl: z.string().url(),
  mode: ScrapeModeSchema,
  maxPages: z.coerce.number().min(1).default(25),
  maxDepth: z.coerce.number().min(0).default(2),
  includePatterns: z.string().optional(),
  excludePatterns: z.string().optional()
});

module.exports = {
  ScrapeModeSchema,
  ScrapeRequestSchema,
  CrawlRequestSchema
};
