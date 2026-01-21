# Web Scraper Tool

## Stack

- Backend: Node.js, Express, Playwright, Cheerio
- Frontend: React, Vite (Javascript)
- Mode: Single Scrape & Async Crawl

## Setup

1. Install dependencies:
   ```bash
   npm run install:all
   ```

## Development

Run backend and frontend in parallel:

```bash
npm run dev
npm run dev:ui
```

UI will be at http://localhost:5173
API at http://localhost:3000

## Production

Build and run (Backend serves Frontend):

```bash
npm run build
npm start
```

## API Examples

```bash
# Scrape
curl -X POST http://localhost:3000/api/scrape -H "Content-Type: application/json" -d '{"url":"https://example.com", "mode":"main_content"}'

# Crawl
curl -X POST http://localhost:3000/api/crawl -H "Content-Type: application/json" -d '{"seedUrl":"https://example.com", "mode":"redesign_context", "maxPages":5}'
```
