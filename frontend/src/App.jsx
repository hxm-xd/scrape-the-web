import React, { useState } from 'react';
import ScrapeTab from './components/ScrapeTab';
import CrawlTab from './components/CrawlTab';
import JobsTab from './components/JobsTab';
import HelpSection from './components/HelpSection';
import Footer from './components/Footer';

function App() {
  const [activeTab, setActiveTab] = useState('scrape');

  return (
    <div className="app-wrapper">
      <div className="container">
        <header>
          <h1>Firecrawl-ish Web Scraper</h1>
          <nav className="tab-nav">
            <button onClick={() => setActiveTab('scrape')} className={activeTab === 'scrape' ? 'active' : ''}>Scrape</button>
            <button onClick={() => setActiveTab('crawl')} className={activeTab === 'crawl' ? 'active' : ''}>Crawl</button>
            <button onClick={() => setActiveTab('jobs')} className={activeTab === 'jobs' ? 'active' : ''}>Jobs</button>
          </nav>
        </header>
        
        <main>
          {activeTab === 'scrape' && (
            <>
              <div className="card">
                 <ScrapeTab />
              </div>
              <HelpSection />
            </>
          )}
          
          {activeTab === 'crawl' && (
            <>
               <div className="card">
                 <CrawlTab />
               </div>
               <HelpSection />
            </>
          )}

          {activeTab === 'jobs' && (
             <div className="card">
               <JobsTab />
             </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;
