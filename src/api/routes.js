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
      forceRender: data.forceRender
    });
    res.json(job);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

router.post('/crawl', async (req, res) => {
  try {
    const data = CrawlRequestSchema.parse(req.body);
    const job = jobManager.createJob(data.seedUrl, data.mode, {
      maxPages: data.maxPages,
      maxDepth: data.maxDepth,
      includePatterns: data.includePatterns,
      excludePatterns: data.excludePatterns
    });
    res.json({ jobId: job.id });
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
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
