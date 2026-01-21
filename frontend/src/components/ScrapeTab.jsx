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
    <div className="card">
      <div className="crawl-form-grid">
        <div className="form-group full-width">
          <label>URL</label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        </div>
        
        <div className="form-group span-2">
          <label>Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="main_content">Main Content (Markdown)</option>
            <option value="redesign_context">Redesign Context</option>
          </select>
        </div>

        <div className="form-group span-2" style={{alignSelf:'center'}}>
           <label className="checkbox-label" style={{display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer', marginBottom:0, height:'42px'}}>
              <input type="checkbox" checked={forceRender} onChange={e => setForceRender(e.target.checked)} style={{width:'auto', margin:0, height:'1.2rem', width:'1.2rem', accentColor:'var(--primary)'}} />
              <span style={{color:'var(--text-main)', fontWeight:'500'}}>Force Render (Playwright)</span>
           </label>
        </div>
      </div>

      <button className="primary" onClick={handleRun} disabled={loading || !url} style={{width:'100%', padding:'1rem'}}>
        {loading ? 'Scraping...' : 'Run Scrape'}
      </button>

      {error && (
        <div style={{
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: 'rgba(69, 10, 10, 0.2)', 
            border: '1px solid rgba(248, 113, 113, 0.2)', 
            color: 'var(--error-text)', 
            borderRadius:'var(--radius-sm)'
        }}>
            {error}
        </div>
      )}

      {result && (
        <div className="results" style={{borderTop:'none', paddingTop:0}}>
          <div className="detail-header" style={{marginBottom:'1rem'}}>
               <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                   <h3 style={{margin:0}}>Result</h3>
                   <span className="status-badge status-completed">{result.status}</span>
               </div>
               <a href={result.finalUrl} target="_blank" rel="noreferrer" style={{color:'var(--text-secondary)', fontSize:'0.9rem', fontFamily:'monospace'}}>{result.finalUrl || 'No URL'}</a>
          </div>
          
          {mode === 'main_content' && (
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                <h4 style={{margin:0}}>Markdown Content</h4>
                <button className="primary" style={{padding:'0.5rem 1rem', fontSize:'0.85rem'}} onClick={() => {
                  const blob = new Blob([result.contentMarkdown], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `scrape-${new Date().getTime()}.md`;
                  link.click();
                  URL.revokeObjectURL(url);
                }} style={{padding: '0.25rem 0.5rem', fontSize:'0.8rem'}}>
                  Download .md
                </button>
              </div>
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
