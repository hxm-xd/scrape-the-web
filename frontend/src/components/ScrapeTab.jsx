import React, { useState } from 'react';

export default function ScrapeTab() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('main_content');
  const [forceRender, setForceRender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode, forceRender })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      pollJob(data.id);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const pollJob = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const job = await res.json();
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          if (job.pages && job.pages.length > 0) {
            setResult({ ...job.pages[0], jobId: job.id });
          } else if (job.errors.length > 0) {
            setError(job.errors.join(', '));
          } else {
             setError('No data returned');
          }
        }
      } catch (e) {
        clearInterval(interval);
        setLoading(false);
        setError(e.message);
      }
    }, 1000);
  };

  const getAssetUrl = (path, jobId) => {
      if (!path) return '#';
      // path might be like outputs\id\file or just filename depending on how I stored it.
      // In scraper.js: path.relative(outputDir, screenPath) -> just filename.
      // So URL is /outputs/jobId/filename
      return `/outputs/${jobId}/${path}`;
  };

  return (
    <div>
      <div className="form-group">
        <label>URL</label>
        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
      </div>
      <div className="form-group">
        <label>Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)}>
          <option value="main_content">Main Content (Markdown)</option>
          <option value="redesign_context">Redesign Context</option>
        </select>
      </div>
      <div className="form-group">
        <label>
          <input type="checkbox" checked={forceRender} onChange={e => setForceRender(e.target.checked)} />
          Force Render (Playwright)
        </label>
      </div>
      <button className="primary" onClick={handleRun} disabled={loading || !url}>
        {loading ? 'Scraping...' : 'Run Scrape'}
      </button>

      {error && <div style={{color:'red', marginTop: '1rem'}}>{error}</div>}

      {result && (
        <div className="results">
          <h3>Result: {result.status}</h3>
          <p>Effective URL: <a href={result.finalUrl} target="_blank" rel="noreferrer">{result.finalUrl}</a></p>
          
          {mode === 'main_content' && (
            <div>
              <h4>Markdown Content</h4>
              <textarea 
                style={{width:'100%', height:'300px', fontFamily:'monospace'}} 
                value={result.contentMarkdown || ''}
                readOnly 
              />
            </div>
          )}

          {mode === 'redesign_context' && (
            <div>
               {result.screenshots && (
               <div style={{display:'flex', gap:'1rem', marginBottom: '1rem'}}>
                  {result.screenshots.desktopPath && (
                     <div>
                       <h4>Desktop Screenshot</h4>
                       <a href={getAssetUrl(result.screenshots.desktopPath, result.jobId)} target="_blank" rel="noreferrer">
                         <img 
                           src={getAssetUrl(result.screenshots.desktopPath, result.jobId)} 
                           style={{maxWidth: '300px', border:'1px solid #ccc'}} 
                           alt="Desktop screenshot"
                         />
                       </a>
                     </div>
                  )}
               </div>
               )}
               <div>
                  <p><strong>Components:</strong> {result.components}</p>
                  <p>
                    <strong>Rendered HTML:</strong> 
                    {' '}<a href={getAssetUrl(result.rawHtmlPath, result.jobId)} target="_blank" rel="noreferrer">View HTML</a>
                  </p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
