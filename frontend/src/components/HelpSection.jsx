import React from 'react';

export default function HelpSection() {
  return (
    <div className="help-section">
      <h3>How to Use</h3>
      <div className="split-layout" style={{ gap: '2rem' }}>
        <div>
          <h4>🔍 Scraping (Single Page)</h4>
          <p>Extract data from a single URL quickly.</p>
          <ul>
            <li><strong>Main Content:</strong> Extracts clean markdown (like Reader Mode).</li>
            <li><strong>Redesign Context:</strong> Captures screenshots, HTML structure, and style info.</li>
            <li><strong>Product Details:</strong> Name and price by default. Switch Output to All details for SKU, availability, and specifications.</li>
            <li><strong>Force Render:</strong> Check this if the site uses heavy JavaScript (SPA).</li>
          </ul>
        </div>
        <div>
          <h4>🕷️ Crawling (Multiple Pages)</h4>
          <p>Recursively visit links starting from a Seed URL.</p>
          <ul>
            <li><strong>Max Depth:</strong> Hops away from seed (0 = just seed, 1 = seed + direct links).</li>
            <li><strong>Include/Exclude:</strong> Filter URLs by keywords (comma-separated).</li>
            <li><strong>Product crawl:</strong> Saves individual products. Category, collection, and filter links such as /collections or ?brand=&amp;page= are followed, not listed, and duplicate URLs are collapsed.</li>
            <li><strong>Download:</strong> Save Markdown, a ZIP, or a Word document when the crawl finishes.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
