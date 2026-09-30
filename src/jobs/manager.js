const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const { runScraper } = require('../core/scraper');
const { identityUrl, isProductUrl, isLikelyProductLink, isPaginationUrl, nextCrawlDepth, urlMatches } = require('../core/catalog');
const pino = require('pino');

const logger = pino();

class JobManager {
  constructor() {
    this.jobs = new Map();
  }

  createJob(seedUrl, mode, config = {}) {
    const id = uuidv4();
    const outputDir = path.join('outputs', id);
    fs.ensureDirSync(path.join(process.cwd(), outputDir));

    const job = {
      id,
      mode,
      seedUrl,
      createdAt: new Date().toISOString(),
      status: 'pending',
      pages: [],
      errors: [],
      outputDir,
      visited: new Set(),
      queued: new Set(),
      productKeys: new Set(),
      fetched: 0,
      queue: [{ url: seedUrl, depth: 0 }],
      config: {
        maxPages: config.maxPages ?? 1,
        maxDepth: config.maxDepth ?? 0,
        includePatterns: config.includePatterns ? config.includePatterns.split(',').map(s => s.trim()) : [],
        excludePatterns: config.excludePatterns ? config.excludePatterns.split(',').map(s => s.trim()) : [],
        forceRender: config.forceRender ?? false,
        selectors: config.selectors || {},
        output: config.output,
        followLinks: config.followLinks ?? (mode === 'product' || (config.maxDepth ?? 0) > 0),
        fetchBudget: config.fetchBudget ?? (
          mode === 'product'
            ? Math.max((config.maxPages ?? 1) * 5 + 5, config.maxPages ?? 1)
            : (config.maxPages ?? 1)
        ),
      },
    };

    this.jobs.set(id, job);
    this.processJob(id);
    return job;
  }

  getJob(id) {
    const job = this.jobs.get(id);
    if (!job) return null;
    return job;
  }

  getAllJobs(limit = 20) {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  async processJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    const CONCURRENCY = 2;

    try {
      while (
        job.queue.length > 0 &&
        job.pages.length < job.config.maxPages &&
        job.fetched < job.config.fetchBudget
      ) {
        const batch = [];
        while (
          batch.length < CONCURRENCY &&
          job.queue.length > 0 &&
          job.pages.length + batch.length < job.config.maxPages &&
          job.fetched < job.config.fetchBudget
        ) {
          const item = job.queue.shift();
          if (!item) break;

          let key = item.url;
          try { key = identityUrl(item.url); } catch { continue; }
          if (job.visited.has(key)) continue;
          job.visited.add(key);
          job.fetched += 1;

          batch.push(this.runPage(job, item.url, item.depth).then((info) => {
            if (job.config.followLinks) this.enqueueLinks(job, info.links, item, info.pageKind);
          }));
        }

        if (batch.length === 0) break;
        await Promise.all(batch);
      }
    } catch (err) {
      logger.error(err);
      job.errors.push(err.message);
    }

    const savedProducts = job.pages.filter((page) => page.product && (page.product.name || page.product.price));
    if (job.mode === 'product' && job.config.followLinks && savedProducts.length === 0) {
      job.errors.push('No product pages were saved. Category and filter pages are not listed as products. Leave Include empty, or use a pattern that matches the product URL, and try the category page again.');
    }

    job.status = 'completed';
  }

  enqueueLinks(job, links, item, pageKind) {
    const products = [];
    const pagination = [];
    const listings = [];

    (links || []).forEach((url) => {
      const depth = nextCrawlDepth({
        url,
        currentUrl: item.url,
        pageKind,
        depth: item.depth,
        maxDepth: job.config.maxDepth,
        mode: job.mode,
      });
      if (depth == null) return;

      let key = url;
      try { key = identityUrl(url); } catch { return; }
      if (job.visited.has(key) || job.queued.has(key)) return;
      const sourceAllowed = !job.config.includePatterns.length
        || job.config.includePatterns.some((pattern) => urlMatches(item.url, pattern));
      const linkAllowed = sourceAllowed
        || job.config.includePatterns.some((pattern) => urlMatches(url, pattern));
      if (!linkAllowed) return;
      if (job.config.excludePatterns.some((pattern) => urlMatches(url, pattern))) return;

      job.queued.add(key);
      const entry = { url, depth };
      if (isProductUrl(url) || isLikelyProductLink(url)) products.push(entry);
      else if (isPaginationUrl(url, item.url)) pagination.push(entry);
      else listings.push(entry);
    });

    if (job.mode === 'product') job.queue = [...products, ...pagination, ...listings, ...job.queue];
    else job.queue.push(...products, ...pagination, ...listings);
  }

  async runPage(job, url, depth) {
    try {
      const result = await runScraper(url, job.mode, job.outputDir, {
        forceRender: job.config.forceRender,
        selectors: job.config.selectors,
        output: job.config.output,
      });
      const pageKind = result.pageKind || 'other';
      const links = result.links?.internal || [];
      const save = job.mode !== 'product' || pageKind === 'product' || !job.config.followLinks;

      if (save) {
        let key = result.finalUrl || url;
        try { key = identityUrl(result.finalUrl || url); } catch { /* keep the raw URL */ }
        if (!job.productKeys.has(key)) {
          job.productKeys.add(key);
          job.pages.push({
            ...result,
            fetchedAt: new Date().toISOString(),
          });
        }
      }

      return { links, pageKind };
    } catch (e) {
      job.errors.push(`Failed ${url}: ${e.message}`);
      if (job.mode !== 'product' || isProductUrl(url) || !job.config.followLinks) {
        job.pages.push({
          url,
          finalUrl: url,
          status: 500,
          fetchedAt: new Date().toISOString(),
          links: { internal: [], external: [] },
          error: e.message
        });
      }
      return { links: [], pageKind: 'other' };
    }
  }
}

module.exports = { jobManager: new JobManager() };
