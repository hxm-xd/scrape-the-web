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
      <h3>Recent Jobs</h3>
      <button onClick={() => window.location.reload()} style={{marginBottom:'1rem'}}>Refresh</button>
      <ul className="job-list">
        {jobs.map(j => (
          <li key={j.jobId} className="job-item" onClick={() => setSelectedJobId(j.jobId)}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>{j.seedUrl}</strong>
              <span className={`status-badge status-${j.status}`}>{j.status}</span>
            </div>
            <div style={{fontSize:'0.8rem', color:'#666'}}>
               {new Date(j.createdAt).toLocaleString()} | {j.mode} | {j.pageCount} pages
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
