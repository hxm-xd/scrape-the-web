import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="dev-info">
          <p>Developed by <strong>Hamood Thariq</strong></p>
          <a href="https://hamoodthariq.vercel.app" target="_blank" rel="noreferrer" className="portfolio-link">
            Visit Portfolio →
          </a>
        </div>
        <div className="tech-stack-container">
          <span className="stack-label">Powered by:</span>
          <div className="tech-stack">
            <span className="tech-tag" title="Frontend Framework">⚛️ React</span>
            <span className="tech-tag" title="Build Tool">⚡ Vite</span>
            <span className="tech-tag" title="Backend Runtime">🟢 Node.js</span>
            <span className="tech-tag" title="Browser Automation">🎭 Playwright</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
