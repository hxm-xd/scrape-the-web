const { chromium } = require('playwright');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const turndownService = new TurndownService();

// Mock implementation of redesign analysis for MVP
async function runScraper(url, mode, outputDir, forceRender) {
  // Validate URL (SSRF check - simple)
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        if (process.env.ALLOW_PRIVATE !== 'true') throw new Error('SSRF blocked');
    }
  } catch (e) { throw new Error('Invalid URL'); }

  let html = '';
  let finalUrl = url;
  let status = 200;
  
  // Try static first if not forced
  if (!forceRender && mode === 'main_content') {
      try {
        const res = await axios.get(url, { timeout: 10000 });
        html = res.data;
        finalUrl = res.request.res.responseUrl || url;
        status = res.status;
      } catch (e) {
        // Fetch failed, continue to Playwright
      }
  }

  if (!html) {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      try {
          const res = await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' });
          if (!res) throw new Error('No response');
          status = res.status();
          finalUrl = page.url();
          html = await page.content();
          
          if (mode === 'redesign_context') {
              const name = crypto.createHash('md5').update(url).digest('hex');
              const screenPathName = `${name}-desktop.png`;
              const screenPath = path.join(outputDir, screenPathName);
              await page.screenshot({ path: screenPath, fullPage: true });
              
              const renderedName = `${name}.html`;
              const renderedPath = path.join(outputDir, renderedName);
              await fs.writeFile(renderedPath, html);
              
              await browser.close();
              
              return {
                  url, finalUrl, status,
                  links: extractLinks(html, finalUrl),
                  rawHtmlPath: renderedName,
                  renderedHtmlPath: renderedName,
                  components: html.split('div').length, 
                  styleTokens: { fonts: ['Arial', 'sans-serif'], colors: ['#000000', '#ffffff'] },
                  screenshots: { desktopPath: screenPathName }
              };
          }
      } catch (e) {
          await browser.close();
          throw e;
      }
      await browser.close();
  }

  const $ = cheerio.load(html);
  $('script, style, nav, footer, head, meta, link, img, picture, video, audio, svg, iframe, object, embed').remove();
  const content = $('body').html() || '';
  const markdown = turndownService.turndown(content);

  return {
    url, finalUrl, status,
    links: extractLinks(html, finalUrl),
    contentMarkdown: markdown,
    contentText: $('body').text().replace(/\s+/g, ' ').trim()
  };
}

function extractLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const internal = new Set();
    const external = new Set();
    const base = new URL(baseUrl);

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        try {
            const absolute = new URL(href, baseUrl).href;
            const absUrl = new URL(absolute);
            
            // Skip PDF files
            if (absUrl.pathname.toLowerCase().endsWith('.pdf')) return;

            if (absUrl.hostname === base.hostname) internal.add(absolute);
            else external.add(absolute);
        } catch { }
    });
    return { internal: [...internal], external: [...external] };
}

module.exports = { runScraper };
