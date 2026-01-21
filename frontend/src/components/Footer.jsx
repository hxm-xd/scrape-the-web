import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="dev-info">
          <p>Built for Vibe-Site</p>
          
        </div>
        <div className="tech-stack-container">
          <div className="tech-stack">
            <span className="tech-tag">React</span>
            <span className="tech-tag">Vite</span>
            <span className="tech-tag">Node.js</span>
            <span className="tech-tag">Playwright</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
