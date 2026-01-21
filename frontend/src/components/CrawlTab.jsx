import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function CrawlTab() {
  const [seedUrl, setSeedUrl] = useState('');
  const [mode, setMode] = useState('main_content');
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(2);
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

  const startCrawl = async () => {
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedUrl, mode, maxPages: parseInt(maxPages), maxDepth: parseInt(maxDepth),
          includePatterns, excludePatterns
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobId(data.jobId);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      {!jobId ? (
        <div className="setup">
           <div className="form-group">
            <label>Seed URL</label>
            <input type="text" value={seedUrl} onChange={e => setSeedUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              <option value="main_content">Main Content</option>
              <option value="redesign_context">Redesign Context</option>
            </select>
          </div>
          <div style={{display:'flex', gap:'1rem'}}>
            <div className="form-group">
              <label>Max Pages</label>
              <input type="number" value={maxPages} onChange={e => setMaxPages(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Max Depth</label>
              <input type="number" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
             <label>Include Patterns (comma sep)</label>
             <input type="text" value={includePatterns} onChange={e => setIncludePatterns(e.target.value)} />
          </div>
          <div className="form-group">
             <label>Exclude Patterns (comma sep)</label>
             <input type="text" value={excludePatterns} onChange={e => setExcludePatterns(e.target.value)} />
          </div>
          <button className="primary" onClick={startCrawl} disabled={!seedUrl}>Start Crawl</button>
        </div>
      ) : (
        <JobDetail jobId={jobId} onBack={() => setJobId(null)} />
      )}
    </div>
  );
}

export function JobDetail({ jobId, onBack }) {
  const [job, setJob] = useState(null);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) setJob(await res.json());
    } catch {}
  };

  const downloadZip = async () => {
    if (!job || !job.pages) return;
    const zip = new JSZip();
    let count = 0;
    
    job.pages.forEach((p, i) => {
      if (p.contentMarkdown) {
        // Safe filename
        let name = p.title || p.url.split('/').pop() || `page-${i}`;
        name = name.replace(/[^a-z0-9\-_]/gi, '_').substring(0, 100);
        if (!name.toLowerCase().endsWith('.md')) name += '.md';
        
        // Handle dupes
        let fileName = name;
        let suffix = 1;
        while (zip.file(fileName)) {
            fileName = name.replace('.md', `_${suffix}.md`);
            suffix++;
        }
        
        zip.file(fileName, p.contentMarkdown);
        count++;
      }
    });

    if (count === 0) return alert('No markdown content available to download.');

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `job-${job.id.substring(0,8)}-markdown.zip`);
    } catch (e) {
        alert('Failed to generate zip: ' + e.message);
    }
  };

  if (!job) return <div>Loading job {jobId}...</div>;

  return (
    <div>
      <button onClick={onBack} style={{marginBottom:'1rem'}}>← Back/New</button>
      <div style={{background:'#fff', padding:'1rem', border:'1px solid #eee', marginBottom:'1rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div>
                <h3>Job: {job.id.slice(0,8)}...</h3>
                <div>Status: <span className={`status-badge status-${job.status}`}>{job.status}</span></div>
                <p>Seed: {job.seedUrl}</p>
                <p>Pages: {job.pages.length} / {job.config.maxPages}</p>
                <p>Errors: {job.errors.length}</p>
            </div>
            {(job.status === 'completed' || job.pages.length > 0) && (
                <button onClick={downloadZip} className="primary" style={{fontSize:'0.9rem'}}>
                    Download Markdown (ZIP)
                </button>
            )}
        </div>
      </div>

      <h4>Pages</h4>
      <ul className="job-list">
        {job.pages.map((p, i) => (
          <li key={i} className="job-item">
             <div style={{display:'flex', justifyContent:'space-between'}}>
               <strong>{p.url}</strong>
               <span>{p.status}</span>
             </div>
             <div>{p.title || 'No title'}</div>
             <div style={{fontSize: 'small', marginTop:'0.5rem'}}>
                <a href={`/outputs/${job.id}/${p.rawHtmlPath || '#'}`} target="_blank" rel="noreferrer">HTML</a> 
                {' | '}
                {p.screenshots?.desktopPath && <a href={`/outputs/${job.id}/${p.screenshots.desktopPath}`} target="_blank" rel="noreferrer">Screenshot</a>}
             </div>
          </li>
        ))}
      </ul>
      
      {job.errors.length > 0 && (
        <div style={{color:'red', marginTop:'1rem'}}>
          <h4>Errors</h4>
          <pre>{job.errors.join('\n')}</pre>
        </div>
      )}
    </div>
  );
}
