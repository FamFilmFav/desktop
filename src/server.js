const path = require('path');
const express = require('express');

function startServer(app, port) {
  const distPath = path.join(__dirname, '../dist');
  const publicPath = path.join(__dirname, '../public');

  // API endpoints FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/version', (req, res) => {
    const packageJson = require('../package.json');
    res.json({ version: packageJson.version });
  });

  // Static files with options
  app.use('/dist', express.static(distPath));
  
  app.use(express.static(publicPath));

  // Catch-all
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  const server = app.listen(port, 'localhost', () => {
    console.log(`Web server listening on http://localhost:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
