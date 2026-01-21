import React, { useState, useEffect } from 'react';
import { JobDetail } from './CrawlTab';

export default function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(setJobs)
      .catch(console.error);
  }, [selectedJobId]);

  if (selectedJobId) {
    return <JobDetail jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
  }

  return (
    <div>
      <div className="result-header">
        <h3>Recent Jobs</h3>
        <button onClick={() => window.location.reload()} className="primary" style={{padding:'0.5rem 1rem', background: 'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-main)'}}>Refresh</button>
      </div>
      
      {jobs.length === 0 ? (
           <p style={{color: 'var(--text-secondary)'}}>No jobs found.</p>
      ) : (
          <div className="job-grid">
            {jobs.map(j => (
              <div key={j.jobId} className="job-card" onClick={() => setSelectedJobId(j.jobId)}>
                <div className="job-card-header">
                  <span className="job-seed-url" title={j.seedUrl}>{j.seedUrl.replace(/^https?:\/\//, '')}</span>
                  <span className={`status-badge status-${j.status}`}>{j.status}</span>
                </div>
                <div className="job-meta-grid">
                   <div className="stat-row">
                     <span>Created</span>
                     <span>{new Date(j.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div className="stat-row">
                     <span>Time</span>
                     <span>{new Date(j.createdAt).toLocaleTimeString()}</span>
                   </div>
                   <div className="stat-row">
                     <span>Mode</span>
                     <span style={{textTransform: 'capitalize'}}>{j.mode.replace('_', ' ')}</span>
                   </div>
                   <div className="stat-row" style={{marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px dashed var(--border-color)'}}>
                     <span>Pages Scraped</span>
                     <span style={{fontWeight:'700', color:'var(--text-main)'}}>{j.pageCount}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}
