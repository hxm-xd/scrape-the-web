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
            <li><strong>Force Render:</strong> Check this if the site uses heavy JavaScript (SPA).</li>
          </ul>
        </div>
        <div>
          <h4>🕷️ Crawling (Multiple Pages)</h4>
          <p>Recursively visit links starting from a Seed URL.</p>
          <ul>
            <li><strong>Max Depth:</strong> Hops away from seed (0 = just seed, 1 = seed + direct links).</li>
            <li><strong>Include/Exclude:</strong> Filter URLs by keywords (comma-separated).</li>
            <li><strong>Download:</strong> Get a ZIP of all markdown files when done.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
