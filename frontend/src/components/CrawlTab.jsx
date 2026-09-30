import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ProductSelectors, { EMPTY_SELECTORS, compactSelectors } from './ProductSelectors';
import { saveMarkdownWord, saveProductsWord } from '../exportWord';

export default function CrawlTab() {
  const [seedUrl, setSeedUrl] = useState('');
  const [mode, setMode] = useState('main_content');
  const [selectors, setSelectors] = useState(EMPTY_SELECTORS);
  const [productOutput, setProductOutput] = useState('name_price');
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(2);
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

  const startCrawl = async () => {
    try {
      let submitUrl = seedUrl.trim();
      if (submitUrl && !/^https?:\/\//i.test(submitUrl)) {
        submitUrl = 'https://' + submitUrl;
      }

      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedUrl: submitUrl, mode, maxPages: parseInt(maxPages), maxDepth: parseInt(maxDepth),
          includePatterns, excludePatterns,
          selectors: mode === 'product'
            ? compactSelectors(selectors, productOutput === 'name_price' ? ['name', 'price'] : undefined)
            : undefined,
          output: mode === 'product' ? productOutput : undefined
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
        <div className="card">
           <div className="crawl-form-grid">
              <div className="form-group full-width">
                <label>Seed URL</label>
                <input type="text" placeholder="https://example.com" value={seedUrl} onChange={e => setSeedUrl(e.target.value)} />
              </div>
              
              <div className="form-group span-2">
                <label>Crawl Mode</label>
                <select value={mode} onChange={e => setMode(e.target.value)}>
                  <option value="main_content">Main Content (Text Focus)</option>
                  <option value="redesign_context">Redesign Context (Struture)</option>
                  <option value="product">Product Details</option>
                </select>
              </div>

               <div className="form-group">
                  <label>Max Depth</label>
                  <input type="number" min="0" max="10" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} />
               </div>

               <div className="form-group">
                  <label>Max Pages</label>
                  <input type="number" min="1" value={maxPages} onChange={e => setMaxPages(e.target.value)} />
               </div>

               <div className="form-group span-2">
                 <label>Include Patterns <span style={{color:'var(--text-muted)', fontWeight:'400', fontSize:'0.8em'}}>(Optional)</span></label>
                 <input type="text" placeholder="/blog/*, /products/*" value={includePatterns} onChange={e => setIncludePatterns(e.target.value)} />
               </div>
               
               <div className="form-group span-2">
                 <label>Exclude Patterns <span style={{color:'var(--text-muted)', fontWeight:'400', fontSize:'0.8em'}}>(Optional)</span></label>
                 <input type="text" placeholder="/auth/*, /admin/*" value={excludePatterns} onChange={e => setExcludePatterns(e.target.value)} />
               </div>

               {mode === 'product' && (
                 <>
                   <div className="form-group span-2">
                     <label>Output</label>
                     <select value={productOutput} onChange={e => setProductOutput(e.target.value)}>
                       <option value="name_price">Name and price</option>
                       <option value="full">All details</option>
                     </select>
                   </div>
                   <ProductSelectors
                     selectors={selectors}
                     onChange={setSelectors}
                     nameAndPriceOnly={productOutput === 'name_price'}
                   />
                 </>
               )}
           </div>
          
          <button className="primary" onClick={startCrawl} disabled={!seedUrl} style={{width:'100%', padding:'1rem'}}>
            Start Crawl
          </button>
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
      if (res.status === 404) {
        // Job no longer exists on server (likely restart)
        // Stop polling by unmounting component or alerting
        onBack(); 
        return;
      }
      if (res.ok) setJob(await res.json());
    } catch {}
  };

  const combinedMarkdown = () => {
    let combined = `# Crawl Report for ${job.seedUrl}\n\n`;
    job.pages.forEach((p, i) => {
        if (!p.contentMarkdown) return;
        combined += `---\n\n`;
        combined += `## Page ${i+1}: ${p.url}\n`;
        combined += `Title: ${p.title || 'Untitled'}\n\n`;
        combined += `${p.contentMarkdown}\n\n`;
    });
    return combined;
  };

  const productRows = () => (job.pages || [])
    .filter((p) => p.product && (p.product.name || p.product.price || p.product.priceText))
    .map((p) => ({ url: p.finalUrl || p.url, ...p.product }));

  const downloadCombined = () => {
    if (!job || !job.pages || job.pages.length === 0) return;
    const blob = new Blob([combinedMarkdown()], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `job-${job.id.substring(0,8)}-combined.md`);
  };

  const downloadProducts = () => {
    const products = productRows();
    if (products.length === 0) return alert('No product details available to download.');
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `job-${job.id.substring(0, 8)}-products.json`);
  };

  const downloadWord = () => {
    if (!job) return;
    const stamp = job.id.substring(0, 8);
    if (job.mode === 'product') {
      const products = productRows();
      if (products.length === 0) return alert('No product details available to download.');
      return saveProductsWord(products, `job-${stamp}-products.docx`, job.seedUrl);
    }
    return saveMarkdownWord(combinedMarkdown(), `job-${stamp}-crawl.docx`, job.seedUrl);
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
      <button onClick={onBack} style={{marginBottom:'1rem', background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer', padding:'0', display:'flex', alignItems:'center', gap:'0.5rem', fontWeight:'500'}}>
         <span>←</span> Back
      </button>

      <div className="detail-header">
        <div className="detail-info">
            <h3 style={{marginTop:0, marginBottom:'0.5rem'}}>Job {job.id.slice(0,8)}</h3>
            <div style={{display:'flex', flexDirection:'column', gap:'0.25rem'}}>
                 <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <span className={`status-badge status-${job.status}`}>{job.status}</span>
                </div>
                <span style={{color:'var(--text-secondary)', fontSize:'0.85rem', fontFamily:'monospace'}}>{job.seedUrl}</span>
            </div>
        </div>
        
        <div className="detail-stats">
             <div className="detail-stat-item">
                <span className="stat-label">Pages Found</span>
                <span className="stat-value">{job.pages.length}<span style={{fontSize:'1rem', color:'var(--text-muted)', fontWeight:'400'}}>/ {job.config.maxPages}</span></span>
             </div>
             <div className="detail-stat-item">
                <span className="stat-label">Errors</span>
                <span className="stat-value" style={{color: job.errors.length > 0 ? 'var(--error-text)' : 'inherit'}}>{job.errors.length}</span>
             </div>
        </div>

        {(job.status === 'completed' || job.pages.length > 0) && (
            <div style={{display:'flex', gap:'0.5rem'}}>
                <button onClick={downloadWord} className="primary" style={{background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'var(--text-main)'}}>
                    Download Word
                </button>
                {job.mode === 'product' ? (
                  <button onClick={downloadProducts} className="primary">
                    Download JSON
                  </button>
                ) : (
                  <>
                    <button onClick={downloadCombined} className="primary" style={{background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'var(--text-main)'}}>
                        Combined MD
                    </button>
                    <button onClick={downloadZip} className="primary">
                        Download ZIP
                    </button>
                  </>
                )}
            </div>
        )}
      </div>

      <h4 style={{marginTop:'2rem', marginBottom:'1rem'}}>Scraped Pages <span style={{color:'var(--text-muted)', fontWeight:'400', fontSize:'0.9rem'}}>({job.pages.length})</span></h4>
      
      {job.pages.length === 0 ? (
          <div className="card" style={{textAlign:'center', color:'var(--text-secondary)'}}>
            {job.status === 'completed'
              ? 'No product pages were saved. Category and filter links are skipped. Try the category URL again with Max Depth at least 1 and Include left blank.'
              : 'No pages scraped yet.'}
          </div>
      ) : (
        <div className="pages-list">
            {job.pages.map((p, i) => (
            <div key={i} className="page-item">
                <div style={{flex:1, minWidth:0, paddingRight:'2rem'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.25rem'}}>
                        <strong className="page-url" title={p.url}>{(p.url.startsWith(job.seedUrl) ? p.url.slice(job.seedUrl.length) : p.url) || '/'}</strong>
                        <span style={{fontSize:'0.7rem', padding:'1px 5px', borderRadius:'4px', background:'var(--bg-main)', color:'var(--text-secondary)', border:'1px solid var(--border-color)'}}>{p.status}</span>
                    </div>
                    <div style={{color:'var(--text-secondary)', fontSize:'0.8rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                      {p.product?.name || p.title || 'Untitled Page'}
                      {p.product?.priceText ? ` · ${p.product.priceText}` : p.product?.price ? ` · ${p.product.price}` : ''}
                    </div>
                </div>
                
                <div style={{display:'flex', gap:'1rem', fontSize: '0.8rem', flexShrink:0}}>
                    {p.rawHtmlPath && <a href={`/outputs/${job.id}/${p.rawHtmlPath}`} target="_blank" rel="noreferrer" style={{color:'var(--text-secondary)'}}>HTML</a>}
                    {p.screenshots?.desktopPath && <a href={`/outputs/${job.id}/${p.screenshots.desktopPath}`} target="_blank" rel="noreferrer" style={{color:'var(--text-secondary)'}}>View Shot</a>}
                </div>
            </div>
            ))}
        </div>
      )}
      
      {job.errors.length > 0 && (
        <div style={{color:'red', marginTop:'1rem'}}>
          <h4>Errors</h4>
          <pre>{job.errors.join('\n')}</pre>
        </div>
      )}
    </div>
  );
}
