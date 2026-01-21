const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const { runScraper } = require('../core/scraper');
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
      queue: [{ url: seedUrl, depth: 0 }],
      config: {
        maxPages: config.maxPages ?? 1,
        maxDepth: config.maxDepth ?? 0,
        includePatterns: config.includePatterns ? config.includePatterns.split(',').map(s => s.trim()) : [],
        excludePatterns: config.excludePatterns ? config.excludePatterns.split(',').map(s => s.trim()) : [],
        forceRender: config.forceRender ?? false,
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
    let running = 0;
    const CONCURRENCY = 2;

    while (
      (job.queue.length > 0 || running > 0) &&
      job.pages.length < job.config.maxPages
    ) {
      while (
        running < CONCURRENCY &&
        job.queue.length > 0 &&
        job.pages.length + running < job.config.maxPages
      ) {
        const item = job.queue.shift();
        if (!item) break;

        const normUrl = item.url.replace(/\/$/, '').toLowerCase();
        if (job.visited.has(normUrl)) continue;
        job.visited.add(normUrl);

        running++;
        this.runPage(job, item.url, item.depth)
          .then((newLinks) => {
            running--;
            if (item.depth < job.config.maxDepth) {
              const unique = newLinks.filter((l) => {
                const u = l.replace(/\/$/, '').toLowerCase();
                return !job.visited.has(u);
              });
              
               const filtered = unique.filter(u => {
                 if (job.config.includePatterns.length && !job.config.includePatterns.some(p => u.includes(p))) return false;
                 if (job.config.excludePatterns.length && job.config.excludePatterns.some(p => u.includes(p))) return false;
                 return true;
               });

              job.queue.push(...filtered.map((u) => ({ url: u, depth: item.depth + 1 })));
            }
          })
          .catch((err) => {
            running--;
            logger.error(err);
            job.errors.push(`Failed ${item.url}: ${err.message}`);
          });
      }
      
      if (running > 0) await new Promise((r) => setTimeout(r, 250));
      else break; 
    }

    job.status = 'completed';
  }

  async runPage(job, url, depth) {
    try {
      const result = await runScraper(url, job.mode, job.outputDir, job.config.forceRender);
      
      const pageRes = {
        ...result,
        fetchedAt: new Date().toISOString(),
      };
      
      job.pages.push(pageRes);
      return pageRes.links.internal;
    } catch (e) {
      job.pages.push({
        url,
        finalUrl: url,
        status: 500,
        fetchedAt: new Date().toISOString(),
        links: { internal: [], external: [] },
        error: e.message
      });
      return [];
    }
  }
}

module.exports = { jobManager: new JobManager() };
