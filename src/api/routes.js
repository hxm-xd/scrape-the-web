const express = require('express');
const { jobManager } = require('../jobs/manager');
const { ScrapeRequestSchema, CrawlRequestSchema } = require('../schemas');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.post('/scrape', async (req, res) => {
  try {
    const data = ScrapeRequestSchema.parse(req.body);
    const job = jobManager.createJob(data.url, data.mode, {
      maxPages: 1,
      forceRender: data.forceRender,
      selectors: data.selectors,
      output: data.output,
      followLinks: false
    });
    res.json(job);
  } catch (e) {
    const errorMsg = e.errors 
      ? e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') 
      : e.message;
    console.error('Scrape API Error:', errorMsg);
    res.status(400).json({ error: errorMsg });
  }
});

router.post('/crawl', async (req, res) => {
  try {
    const data = CrawlRequestSchema.parse(req.body);
    const job = jobManager.createJob(data.seedUrl, data.mode, {
      maxPages: data.maxPages,
      maxDepth: data.maxDepth,
      includePatterns: data.includePatterns,
      excludePatterns: data.excludePatterns,
      selectors: data.selectors,
      output: data.output
    });
    res.json({ jobId: job.id });
  } catch (e) {
    const errorMsg = e.errors 
      ? e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') 
      : e.message;
    console.error('Crawl API Error:', errorMsg);
    res.status(400).json({ error: errorMsg });
  }
});

router.get('/jobs', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const jobs = jobManager.getAllJobs(limit).map(j => ({
    jobId: j.id,
    mode: j.mode,
    status: j.status,
    createdAt: j.createdAt,
    seedUrl: j.seedUrl,
    pageCount: j.pages.length
  }));
  res.json(jobs);
});

router.get('/jobs/:id', (req, res) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const { visited, queue, ...rest } = job;
  res.json({
      ...rest,
      visited: Array.from(visited)
  });
});

module.exports = { apiRouter: router };
