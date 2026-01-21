import React, { useState } from 'react';
import ScrapeTab from './components/ScrapeTab';
import CrawlTab from './components/CrawlTab';
import JobsTab from './components/JobsTab';

function App() {
  const [activeTab, setActiveTab] = useState('scrape');

  return (
    <div className="container">
      <header>
        <h1>Firecrawl-ish Scraper</h1>
        <nav>
          <button onClick={() => setActiveTab('scrape')} className={activeTab === 'scrape' ? 'active' : ''}>Scrape</button>
          <button onClick={() => setActiveTab('crawl')} className={activeTab === 'crawl' ? 'active' : ''}>Crawl</button>
          <button onClick={() => setActiveTab('jobs')} className={activeTab === 'jobs' ? 'active' : ''}>Jobs</button>
        </nav>
      </header>
      <main>
        {activeTab === 'scrape' && <ScrapeTab />}
        {activeTab === 'crawl' && <CrawlTab />}
        {activeTab === 'jobs' && <JobsTab />}
      </main>
    </div>
  );
}

export default App;
