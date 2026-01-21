const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const { apiRouter } = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const logger = pino({ transport: { target: 'pino-pretty' } });

fs.ensureDirSync(path.join(process.cwd(), 'outputs'));

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);
app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));

const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
// Serve static frontend if it exists
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/outputs')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
