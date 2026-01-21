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
        <button onClick={() => window.location.reload()} style={{padding:'0.5rem 1rem'}}>Refresh</button>
      </div>
      <ul className="job-list">
        {jobs.map(j => (
          <li key={j.jobId} className="job-item" onClick={() => setSelectedJobId(j.jobId)}>
            <div className="job-item-header">
              <strong>{j.seedUrl}</strong>
              <span className={`status-badge status-${j.status}`}>{j.status}</span>
            </div>
            <div className="job-meta">
               <span>📅 {new Date(j.createdAt).toLocaleDateString()} {new Date(j.createdAt).toLocaleTimeString()}</span>
               <span>📝 {j.mode}</span>
               <span>📄 {j.pageCount} pages</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
